import asyncio
import logging
import math
import time

from telegram import BotCommand, KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.error import TelegramError
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

from app.client import backend_request
from app.config import settings

REGISTER_ROOM, REGISTER_NAME = range(2)
TASK_ANSWER = 10
EDIT_SELECT = 11
EDIT_ANSWER = 12
logger = logging.getLogger(__name__)

# Largest quantity a single numeric answer may hold. Must match the backend
# MAX_QUANTITY guard in scoring.py. Anything above this is junk (e.g. a
# thousand-digit number) that pollutes results and can overflow scores.
MAX_QUANTITY = 1e9

NUMERIC_TASK_TYPES = {"quantity", "range"}


def _numeric_answer_error(task: dict, answer_text: str) -> str | None:
    """Return an error message if a numeric task answer is not a sane finite number, else None."""
    if task["type"] not in NUMERIC_TASK_TYPES:
        return None
    try:
        value = float(answer_text.strip())
    except (ValueError, OverflowError):
        return "Please send a valid number (use a dot for decimals, e.g. 3.5)."
    if not math.isfinite(value):
        return "Please send a real number."
    if task["type"] == "quantity" and value < 0:
        return "Please send a number of 0 or more."
    if abs(value) > MAX_QUANTITY:
        return f"That number is too large. Maximum allowed is {int(MAX_QUANTITY):,}."
    return None

BUTTON_SUBMIT_TASKS = "Submit today's tasks"
BUTTON_EDIT_TASKS = "Edit today's tasks"
BUTTON_TODAY_RESULT = "Today's result"
BUTTON_MY_RANK = "My rank"
BUTTON_MY_ROOMS = "My rooms"
BUTTON_HELP = "Help"
BUTTON_CANCEL = "Cancel"
BUTTON_BACK = "Back"
BUTTON_KEEP_CURRENT = "Keep current"
BUTTON_DONE_EDITING = "Done editing"
BUTTON_YES = "Yes"
BUTTON_NO = "No"


def _telegram_id(update: Update) -> str:
    return str(update.effective_user.id)


def _main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BUTTON_SUBMIT_TASKS), KeyboardButton(BUTTON_EDIT_TASKS)],
            [KeyboardButton(BUTTON_TODAY_RESULT), KeyboardButton(BUTTON_MY_RANK)],
            [KeyboardButton(BUTTON_MY_ROOMS), KeyboardButton(BUTTON_HELP)],
        ],
        resize_keyboard=True,
        is_persistent=True,
        input_field_placeholder="Choose an action or type a command",
    )


def _cancel_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [[KeyboardButton(BUTTON_CANCEL)]],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Send your answer or cancel",
    )


def _task_keyboard(task: dict, *, has_back: bool, has_existing: bool) -> ReplyKeyboardMarkup:
    rows: list[list[KeyboardButton]] = []

    if task["type"] == "yes_no":
        rows.append([KeyboardButton(BUTTON_YES), KeyboardButton(BUTTON_NO)])

    utility_row: list[KeyboardButton] = []
    if has_back:
        utility_row.append(KeyboardButton(BUTTON_BACK))
    if has_existing:
        utility_row.append(KeyboardButton(BUTTON_KEEP_CURRENT))
    if utility_row:
        rows.append(utility_row)

    rows.append([KeyboardButton(BUTTON_CANCEL)])
    return ReplyKeyboardMarkup(
        rows,
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Send the task answer",
    )


def _task_button_label(index: int, task: dict) -> str:
    name = task["name"]
    if len(name) > 24:
        name = f"{name[:21]}..."
    return f"{index + 1}. {name}"


def _edit_task_selection_keyboard(prompt: dict) -> ReplyKeyboardMarkup:
    buttons = [_task_button_label(index, task) for index, task in enumerate(prompt["tasks"])]
    rows: list[list[KeyboardButton]] = []
    for index in range(0, len(buttons), 2):
        rows.append([KeyboardButton(label) for label in buttons[index:index + 2]])
    rows.append([KeyboardButton(BUTTON_DONE_EDITING)])
    rows.append([KeyboardButton(BUTTON_CANCEL)])
    return ReplyKeyboardMarkup(
        rows,
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Choose a task to edit",
    )


async def _reply(
    update: Update,
    text: str,
    *,
    reply_markup: ReplyKeyboardMarkup | ReplyKeyboardRemove | None = None,
) -> None:
    if update.message is not None:
        await update.message.reply_text(text, reply_markup=reply_markup)


async def _joined_rooms(update: Update) -> list[dict]:
    return await backend_request("GET", f"/bot/telegram/{_telegram_id(update)}/rooms")


def _clear_task_session(context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data.pop("task_prompt", None)
    context.user_data.pop("task_existing_answers", None)
    context.user_data.pop("task_answers", None)
    context.user_data.pop("task_index", None)
    context.user_data.pop("task_button_map", None)


async def _resolve_current_student(update: Update, context: ContextTypes.DEFAULT_TYPE) -> dict:
    rooms = await _joined_rooms(update)
    if not rooms:
        raise RuntimeError("Register first with /start.")

    current_room_id = context.user_data.get("current_room_id")
    current_room = next((room for room in rooms if room["room_id"] == current_room_id), None)
    if current_room is None:
        current_room = rooms[0]
        context.user_data["current_room_id"] = current_room["room_id"]

    student = await backend_request("GET", f"/bot/telegram/{_telegram_id(update)}/room/{current_room['room_id']}/student")
    context.user_data["current_student_id"] = student["student_id"]
    context.user_data["current_room_name"] = student["room_name"]
    return student


def _task_target_text(task: dict) -> str:
    if task["type"] == "yes_no":
        return "Answer with Yes or No."
    if task["type"] == "text":
        return "Send a short text answer."
    if task["type"] == "range" and task.get("target_max") not in (None, 0):
        return f'Target range: {task.get("target", 0)} to {task["target_max"]}.'
    if task["type"] == "quantity" and task.get("target") is not None:
        return f'Minimum target: {task["target"]}.'
    return "Send your answer."


async def _prompt_task(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    prompt = context.user_data["task_prompt"]
    index = context.user_data["task_index"]
    tasks = prompt["tasks"]
    task = tasks[index]
    existing_answers: dict[int, str] = context.user_data.get("task_existing_answers", {})
    existing_value = existing_answers.get(task["id"])
    lines = [
        f'Room: {prompt["room"]["room_name"]}',
        f'Date: {prompt["date"]}',
        f'Editing stays open until {prompt["deadline"]}.',
        "",
        f'{index + 1} of {len(tasks)}. {task["name"]}',
        f'Type: {task["type"]}',
        f'Points: {task["points"]}',
        _task_target_text(task),
    ]
    if existing_value is not None:
        lines.extend(["", f"Current saved value: {existing_value}", f'Tap "{BUTTON_KEEP_CURRENT}" to keep it.'])
    if index > 0:
        lines.append(f'Tap "{BUTTON_BACK}" to change the previous answer.')

    await _reply(
        update,
        "\n".join(lines),
        reply_markup=_task_keyboard(task, has_back=index > 0, has_existing=existing_value is not None),
    )


async def _send_main_menu(update: Update, extra_text: str | None = None) -> None:
    text = (
        extra_text
        or "Choose an action below, or type /help to see all available commands."
    )
    await _reply(update, text, reply_markup=_main_menu_keyboard())


async def _show_edit_task_picker(update: Update, context: ContextTypes.DEFAULT_TYPE, intro_text: str | None = None) -> None:
    prompt = context.user_data["task_prompt"]
    tasks = prompt["tasks"]
    existing_answers: dict[int, str] = context.user_data.get("task_existing_answers", {})
    button_map = {_task_button_label(index, task): index for index, task in enumerate(tasks)}
    context.user_data["task_button_map"] = button_map

    lines = [
        intro_text or "Tap a task below to edit it.",
        "",
        f'Room: {prompt["room"]["room_name"]}',
        f'Date: {prompt["date"]}',
        f'Editing stays open until {prompt["deadline"]}.',
        "",
        "Current saved values:",
    ]
    for index, task in enumerate(tasks, start=1):
        current_value = existing_answers.get(task["id"], "Not answered yet")
        lines.append(f'{index}. {task["name"]}: {current_value}')
    lines.extend(["", f'Tap "{BUTTON_DONE_EDITING}" when you are finished.'])
    await _reply(update, "\n".join(lines), reply_markup=_edit_task_selection_keyboard(prompt))


async def _submit_single_task_answer(
    context: ContextTypes.DEFAULT_TYPE,
    *,
    student_id: int,
    task_id: int,
    value: str,
) -> dict:
    prompt = context.user_data["task_prompt"]
    payload = {
        "date": prompt["date"],
        "submitted_via": "telegram",
        "answers": [{"task_id": task_id, "value": value}],
    }
    return await backend_request("POST", f"/bot/students/{student_id}/submissions", payload)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    rooms = await _joined_rooms(update)
    if rooms:
        current_room = next(
            (room for room in rooms if room["room_id"] == context.user_data.get("current_room_id")),
            rooms[0],
        )
        context.user_data["current_room_id"] = current_room["room_id"]
        await _reply(
            update,
            (
                "You already have access to one or more rooms.\n"
                f'Current room: "{current_room["room_name"]}" ({current_room["room_code"]}).\n'
                "Send another room code if you want to join a new room, or use the menu below."
            ),
            reply_markup=_cancel_keyboard(),
        )
    else:
        await _reply(
            update,
            (
                "Welcome to Student Contest.\n"
                "Send the room code to register.\n"
                "Example: RAM25"
            ),
            reply_markup=_cancel_keyboard(),
        )
    return REGISTER_ROOM


async def register_room_code(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    room_code = update.message.text.strip().upper()
    if room_code == BUTTON_CANCEL:
        return await cancel(update, context)

    try:
        room = await backend_request("POST", "/bot/rooms/validate", {"room_code": room_code})
    except RuntimeError as exc:
        await _reply(
            update,
            (
                f"Error: {exc}\n"
                "Please check the room code and try again, or tap Cancel."
            ),
            reply_markup=_cancel_keyboard(),
        )
        return REGISTER_ROOM

    context.user_data["pending_room_code"] = room["room_code"]
    context.user_data["pending_room_name"] = room["room_name"]
    await _reply(
        update,
        (
            f'Room found: "{room["room_name"]}".\n'
            "Enter the name you want to use in this room."
        ),
        reply_markup=_cancel_keyboard(),
    )
    return REGISTER_NAME


async def register_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    name = update.message.text.strip()
    if name == BUTTON_CANCEL:
        return await cancel(update, context)

    room_code = context.user_data.get("pending_room_code")
    if not room_code:
        await _reply(update, "Registration session expired. Use /start again.", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    payload = {
        "room_code": room_code,
        "name": name,
        "telegram_id": _telegram_id(update),
        "telegram_username": update.effective_user.username,
    }
    try:
        response = await backend_request("POST", "/bot/register", payload)
    except RuntimeError as exc:
        await _reply(update, f"Registration error: {exc}", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    context.user_data["current_room_id"] = response["room"]["id"]
    context.user_data["current_student_id"] = response["student"]["id"]
    context.user_data.pop("pending_room_code", None)
    context.user_data.pop("pending_room_name", None)

    if response["already_registered"]:
        message = (
            f'You are already registered in "{response["room"]["name"]}" as {response["student"]["name"]}.'
        )
    else:
        message = (
            f'You are now registered in "{response["room"]["name"]}" as {response["student"]["name"]}.'
        )

    await _send_main_menu(
        update,
        message
        + "\n\nUse the menu below to submit tasks, review today’s result, or check your rank.",
    )
    return ConversationHandler.END


async def cancel(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> int:
    _clear_task_session(_context)
    await _reply(update, "Cancelled. You can continue from the menu below.", reply_markup=_main_menu_keyboard())
    return ConversationHandler.END


async def help_command(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    username = update.effective_user.username
    is_superuser = username and username.lower() == settings.superuser_username.lower()

    help_text = (
        "Commands:\n"
        "/start - join a room or add another room\n"
        "/room - show your rooms and the current room\n"
        "/use ROOMCODE - switch the current room\n"
        "/tasks - submit today's tasks\n"
        "/edit - edit today's tasks before the deadline\n"
        "/result - show today's saved result\n"
        "/rank - show your current rank\n"
        "/menu - show the main action buttons\n"
        "/help - show this help message"
    )
    if is_superuser:
        help_text += "\n\nSuperuser Commands:\n/broadcast <message> - send a message to all registered users"

    await _reply(
        update,
        help_text,
        reply_markup=_main_menu_keyboard(),
    )


async def broadcast_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    username = update.effective_user.username
    if not username or username.lower() != settings.superuser_username.lower():
        await _reply(update, "You are not authorized to use this command.")
        return

    replied_message = update.message.reply_to_message

    if replied_message:
        from_chat_id = replied_message.chat_id
        message_id = replied_message.message_id
        is_reply = True
    else:
        if not context.args:
            await _reply(
                update,
                (
                    "Usage:\n"
                    "• Send `/broadcast <text>` to broadcast a text message.\n"
                    "• Reply to any message (including photos, videos, or formatted text) with `/broadcast` to broadcast it."
                )
            )
            return
        message_text = " ".join(context.args)
        is_reply = False

    status_message = await update.message.reply_text("Starting broadcast to all users...")

    try:
        telegram_ids = await backend_request("GET", "/bot/students/telegram-ids")
    except Exception as exc:
        await status_message.edit_text(f"Failed to fetch telegram IDs from backend: {exc}")
        return

    success_count = 0
    failure_count = 0

    for tg_id in telegram_ids:
        try:
            if is_reply:
                await context.bot.copy_message(
                    chat_id=int(tg_id),
                    from_chat_id=from_chat_id,
                    message_id=message_id
                )
            else:
                await context.bot.send_message(chat_id=int(tg_id), text=message_text)
            success_count += 1
        except Exception as e:
            logger.error(f"Failed to send broadcast to {tg_id}: {e}")
            failure_count += 1
        await asyncio.sleep(0.05)

    await status_message.edit_text(
        f"Broadcast completed!\n"
        f"Successfully sent to {success_count} users.\n"
        f"Failed for {failure_count} users."
    )


async def menu_command(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_main_menu(update)


async def room_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        rooms = await _joined_rooms(update)
    except RuntimeError as exc:
        await _reply(update, str(exc), reply_markup=_main_menu_keyboard())
        return

    if not rooms:
        await _reply(update, "You are not registered in any room yet. Use /start.", reply_markup=_main_menu_keyboard())
        return

    current_room_id = context.user_data.get("current_room_id")
    lines = ["Your rooms:", ""]
    for room in rooms:
        marker = "Current" if room["room_id"] == current_room_id else "Available"
        lines.append(f'- {room["room_name"]} ({room["room_code"]}) [{marker}]')
    lines.extend(["", 'To switch rooms, use /use ROOMCODE.'])
    await _reply(update, "\n".join(lines), reply_markup=_main_menu_keyboard())


async def use_room_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await _reply(update, "Usage: /use ROOMCODE", reply_markup=_main_menu_keyboard())
        return

    code = context.args[0].strip().upper()
    rooms = await _joined_rooms(update)
    room = next((item for item in rooms if item["room_code"] == code), None)
    if room is None:
        await _reply(update, "You are not registered in that room.", reply_markup=_main_menu_keyboard())
        return
    context.user_data["current_room_id"] = room["room_id"]
    await _send_main_menu(update, f'Current room switched to "{room["room_name"]}".')


async def tasks_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        student = await _resolve_current_student(update, context)
        prompt = await backend_request("GET", f"/bot/students/{student['student_id']}/tasks/today")
        result = await backend_request("GET", f"/bot/students/{student['student_id']}/result/today")
    except RuntimeError as exc:
        await _reply(update, str(exc), reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    tasks = prompt["tasks"]
    if not tasks:
        await _reply(update, "There are no active tasks in this room yet.", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    if not prompt["can_edit"]:
        await _reply(
            update,
            f'Editing is closed for today. The deadline was {prompt["deadline"]}. Use /result to review the saved result.',
            reply_markup=_main_menu_keyboard(),
        )
        return ConversationHandler.END

    existing_answers = {
        item["task_id"]: item["value"]
        for item in result["items"]
        if item["task_id"] > 0
    }

    context.user_data["task_prompt"] = prompt
    context.user_data["task_existing_answers"] = existing_answers
    context.user_data["task_answers"] = dict(existing_answers)
    context.user_data["task_index"] = 0

    intro_lines = [
        f'Current room: {prompt["room"]["room_name"]}',
        f'Date: {prompt["date"]}',
        f'Editing stays open until {prompt["deadline"]}.',
        "",
        "You can correct mistakes before the deadline.",
        f'Use "{BUTTON_BACK}" to return to the previous task.',
    ]
    if existing_answers:
        intro_lines.append(
            f'You already have saved answers for today. Tap "{BUTTON_KEEP_CURRENT}" on a task to keep its current value.'
        )

    await _reply(update, "\n".join(intro_lines), reply_markup=_cancel_keyboard())
    await _prompt_task(update, context)
    return TASK_ANSWER


async def edit_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        student = await _resolve_current_student(update, context)
        prompt = await backend_request("GET", f"/bot/students/{student['student_id']}/tasks/today")
        result = await backend_request("GET", f"/bot/students/{student['student_id']}/result/today")
    except RuntimeError as exc:
        await _reply(update, str(exc), reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    tasks = prompt["tasks"]
    if not tasks:
        await _reply(update, "There are no active tasks in this room yet.", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    if not prompt["can_edit"]:
        await _reply(
            update,
            f'Editing is closed for today. The deadline was {prompt["deadline"]}. Use /result to review the saved result.',
            reply_markup=_main_menu_keyboard(),
        )
        return ConversationHandler.END

    existing_answers = {
        item["task_id"]: item["value"]
        for item in result["items"]
        if item["task_id"] > 0
    }

    context.user_data["task_prompt"] = prompt
    context.user_data["task_existing_answers"] = existing_answers
    context.user_data["task_answers"] = dict(existing_answers)
    context.user_data["task_index"] = 0

    await _show_edit_task_picker(
        update,
        context,
        intro_text="Choose the task you want to edit. You can update one task at a time.",
    )
    return EDIT_SELECT


async def edit_select(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    answer_text = update.message.text.strip()
    if answer_text == BUTTON_CANCEL:
        return await cancel(update, context)
    if answer_text == BUTTON_DONE_EDITING:
        _clear_task_session(context)
        await _send_main_menu(update, "Editing finished. Use the menu below for the next action.")
        return ConversationHandler.END

    button_map: dict[str, int] = context.user_data.get("task_button_map", {})
    task_index = button_map.get(answer_text)
    if task_index is None:
        await _show_edit_task_picker(
            update,
            context,
            intro_text="Use the task buttons below to choose what you want to edit.",
        )
        return EDIT_SELECT

    context.user_data["task_index"] = task_index
    prompt = context.user_data["task_prompt"]
    task = prompt["tasks"][task_index]
    existing_answers: dict[int, str] = context.user_data.get("task_existing_answers", {})
    existing_value = existing_answers.get(task["id"])
    lines = [
        f'Editing task: {task["name"]}',
        f'Type: {task["type"]}',
        f'Points: {task["points"]}',
        _task_target_text(task),
    ]
    if existing_value is not None:
        lines.extend(["", f"Current saved value: {existing_value}", f'Tap "{BUTTON_KEEP_CURRENT}" to keep it unchanged.'])
    lines.extend(["", f'Tap "{BUTTON_BACK}" to go back to the task list.'])
    await _reply(
        update,
        "\n".join(lines),
        reply_markup=_task_keyboard(task, has_back=True, has_existing=existing_value is not None),
    )
    return EDIT_ANSWER


async def edit_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    prompt = context.user_data.get("task_prompt")
    if not prompt:
        await _reply(update, "Edit session expired. Use /edit again.", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    answer_text = update.message.text.strip()
    if answer_text == BUTTON_CANCEL:
        return await cancel(update, context)
    if answer_text == BUTTON_BACK:
        await _show_edit_task_picker(update, context)
        return EDIT_SELECT

    task_index = context.user_data.get("task_index", 0)
    task = prompt["tasks"][task_index]
    existing_answers: dict[int, str] = context.user_data.get("task_existing_answers", {})

    if answer_text == BUTTON_KEEP_CURRENT:
        existing_value = existing_answers.get(task["id"])
        if existing_value is None:
            await _reply(
                update,
                "There is no saved value for this task yet. Send a new answer instead.",
                reply_markup=_task_keyboard(task, has_back=True, has_existing=False),
            )
            return EDIT_ANSWER
        normalized_answer = existing_value
    else:
        normalized_answer = answer_text
        if task["type"] == "yes_no":
            if answer_text not in {BUTTON_YES, BUTTON_NO}:
                await _reply(
                    update,
                    'Please use the Yes or No buttons for this task.',
                    reply_markup=_task_keyboard(task, has_back=True, has_existing=task["id"] in existing_answers),
                )
                return EDIT_ANSWER
            normalized_answer = "yes" if answer_text == BUTTON_YES else "no"
        else:
            numeric_error = _numeric_answer_error(task, answer_text)
            if numeric_error is not None:
                await _reply(
                    update,
                    numeric_error,
                    reply_markup=_task_keyboard(task, has_back=True, has_existing=task["id"] in existing_answers),
                )
                return EDIT_ANSWER

    student_id = context.user_data.get("current_student_id")
    try:
        result = await _submit_single_task_answer(
            context,
            student_id=student_id,
            task_id=task["id"],
            value=normalized_answer,
        )
    except RuntimeError as exc:
        await _reply(update, f"Could not save the task: {exc}", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    refreshed_answers = {
        item["task_id"]: item["value"]
        for item in result["items"]
        if item["task_id"] > 0
    }
    context.user_data["task_existing_answers"] = refreshed_answers
    context.user_data["task_answers"] = dict(refreshed_answers)

    await _show_edit_task_picker(
        update,
        context,
        intro_text=(
            f'Saved "{task["name"]}" as "{normalized_answer}".\n'
            f'Current total: {result["total_points"]} points.'
        ),
    )
    return EDIT_SELECT


async def tasks_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    prompt = context.user_data.get("task_prompt")
    if not prompt:
        await _reply(update, "Submission session expired. Use /tasks again.", reply_markup=_main_menu_keyboard())
        return ConversationHandler.END

    answer_text = update.message.text.strip()
    if answer_text == BUTTON_CANCEL:
        return await cancel(update, context)

    tasks = prompt["tasks"]
    task_index = context.user_data.get("task_index", 0)
    task = tasks[task_index]
    existing_answers: dict[int, str] = context.user_data.get("task_existing_answers", {})
    answers: dict[int, str] = context.user_data.get("task_answers", {})

    if answer_text == BUTTON_BACK:
        if task_index == 0:
            await _reply(update, "You are already on the first task.", reply_markup=_task_keyboard(task, has_back=False, has_existing=task["id"] in existing_answers))
            return TASK_ANSWER
        context.user_data["task_index"] = task_index - 1
        await _prompt_task(update, context)
        return TASK_ANSWER

    if answer_text == BUTTON_KEEP_CURRENT:
        existing_value = existing_answers.get(task["id"])
        if existing_value is None:
            await _reply(update, "There is no saved value for this task yet.", reply_markup=_task_keyboard(task, has_back=task_index > 0, has_existing=False))
            return TASK_ANSWER
        answers[task["id"]] = existing_value
    else:
        normalized_answer = answer_text
        if task["type"] == "yes_no":
            if answer_text not in {BUTTON_YES, BUTTON_NO}:
                await _reply(
                    update,
                    'Please use the Yes or No buttons for this task.',
                    reply_markup=_task_keyboard(task, has_back=task_index > 0, has_existing=task["id"] in existing_answers),
                )
                return TASK_ANSWER
            normalized_answer = "yes" if answer_text == BUTTON_YES else "no"
        else:
            numeric_error = _numeric_answer_error(task, answer_text)
            if numeric_error is not None:
                await _reply(
                    update,
                    numeric_error,
                    reply_markup=_task_keyboard(task, has_back=task_index > 0, has_existing=task["id"] in existing_answers),
                )
                return TASK_ANSWER
        answers[task["id"]] = normalized_answer

    context.user_data["task_answers"] = answers
    context.user_data["task_index"] = task_index + 1

    if task_index + 1 >= len(tasks):
        student_id = context.user_data.get("current_student_id")
        payload = {
            "date": prompt["date"],
            "submitted_via": "telegram",
            "answers": [{"task_id": item["id"], "value": answers.get(item["id"], "")} for item in tasks],
        }
        try:
            result = await backend_request("POST", f"/bot/students/{student_id}/submissions", payload)
        except RuntimeError as exc:
            await _reply(update, f"Could not save answers: {exc}", reply_markup=_main_menu_keyboard())
            return ConversationHandler.END

        lines = [f'Your result for {result["date"]}:', ""]
        for item in result["items"]:
            lines.append(f'{item["task_name"]}: {item["value"]} - {item["points_earned"]} points')
        lines.extend(
            [
                "",
                f'Day total: {result["day_points"]}',
                f'Total score: {result["total_points"]}',
                "",
                f'If you notice a mistake before {result["deadline"]}, use /edit or tap "{BUTTON_EDIT_TASKS}".',
            ]
        )
        await _send_main_menu(update, "\n".join(lines))
        _clear_task_session(context)
        return ConversationHandler.END

    await _prompt_task(update, context)
    return TASK_ANSWER


async def result_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        student = await _resolve_current_student(update, context)
        result = await backend_request("GET", f"/bot/students/{student['student_id']}/result/today")
    except RuntimeError as exc:
        await _reply(update, str(exc), reply_markup=_main_menu_keyboard())
        return

    if not result["items"]:
        await _reply(
            update,
            "There are no saved answers for today yet. Use /tasks to submit them.",
            reply_markup=_main_menu_keyboard(),
        )
        return

    lines = [f'Result for {result["date"]}:', ""]
    for item in result["items"]:
        lines.append(f'{item["task_name"]}: {item["value"]} - {item["points_earned"]} points')
    lines.extend(
        [
            "",
            f'Points today: {result["day_points"]}',
            f'Total score: {result["total_points"]}',
            "",
            f'Use /edit before {result["deadline"]} if you need to correct something.',
        ]
    )
    await _reply(update, "\n".join(lines), reply_markup=_main_menu_keyboard())


async def rank_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        student = await _resolve_current_student(update, context)
        result = await backend_request("GET", f"/bot/students/{student['student_id']}/rank")
    except RuntimeError as exc:
        await _reply(update, str(exc), reply_markup=_main_menu_keyboard())
        return

    await _reply(
        update,
        (
            f'Total score: {result["total_points"]}\n'
            f'Points today: {result["today_points"]}'
        ),
        reply_markup=_main_menu_keyboard(),
    )


async def notification_worker(application: Application) -> None:
    while True:
        try:
            due_notifications = await backend_request("POST", "/bot/notifications/dispatch")
            for notification in due_notifications:
                try:
                    await application.bot.send_message(
                        chat_id=int(notification["telegram_id"]),
                        text=notification["message"],
                        reply_markup=_main_menu_keyboard(),
                    )
                    await backend_request(
                        "POST",
                        f'/bot/notifications/{notification["notification_id"]}/delivery',
                        {"status": "sent", "error_message": None},
                    )
                except TelegramError as exc:
                    await backend_request(
                        "POST",
                        f'/bot/notifications/{notification["notification_id"]}/delivery',
                        {"status": "failed", "error_message": str(exc)},
                    )
        except asyncio.CancelledError:
            raise
        except Exception:
            pass

        await asyncio.sleep(settings.notification_poll_seconds)


async def on_startup(application: Application) -> None:
    application.bot_data["notification_worker"] = asyncio.create_task(notification_worker(application))
    await application.bot.set_my_commands(
        [
            BotCommand("start", "join a room or add another room"),
            BotCommand("room", "show your rooms"),
            BotCommand("use", "switch the current room"),
            BotCommand("tasks", "submit today's tasks"),
            BotCommand("edit", "edit today's tasks before deadline"),
            BotCommand("result", "show today's result"),
            BotCommand("rank", "show your current rank"),
            BotCommand("menu", "show action buttons"),
            BotCommand("help", "show help"),
        ]
    )


async def on_shutdown(application: Application) -> None:
    worker = application.bot_data.get("notification_worker")
    if worker is not None:
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass


def build_application() -> Application:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN_MISSING")

    application = (
        Application.builder()
        .token(settings.telegram_bot_token)
        .post_init(on_startup)
        .post_shutdown(on_shutdown)
        .build()
    )

    registration_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            REGISTER_ROOM: [MessageHandler(filters.TEXT & ~filters.COMMAND, register_room_code)],
            REGISTER_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, register_name)],
        },
        fallbacks=[
            CommandHandler("cancel", cancel),
            MessageHandler(filters.Regex(f"^{BUTTON_CANCEL}$"), cancel),
        ],
    )

    tasks_handler = ConversationHandler(
        entry_points=[
            CommandHandler("tasks", tasks_start),
            CommandHandler("edit", edit_command),
            MessageHandler(filters.Regex(f"^{BUTTON_SUBMIT_TASKS}$"), tasks_start),
            MessageHandler(filters.Regex(f"^{BUTTON_EDIT_TASKS}$"), edit_command),
        ],
        states={
            TASK_ANSWER: [MessageHandler(filters.TEXT & ~filters.COMMAND, tasks_answer)],
            EDIT_SELECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_select)],
            EDIT_ANSWER: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_answer)],
        },
        fallbacks=[
            CommandHandler("cancel", cancel),
            MessageHandler(filters.Regex(f"^{BUTTON_CANCEL}$"), cancel),
        ],
    )

    application.add_handler(registration_handler)
    application.add_handler(tasks_handler)
    application.add_handler(CommandHandler("room", room_command))
    application.add_handler(CommandHandler("use", use_room_command))
    application.add_handler(CommandHandler("result", result_command))
    application.add_handler(CommandHandler("rank", rank_command))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("broadcast", broadcast_command))
    application.add_handler(MessageHandler(filters.Regex(f"^{BUTTON_MY_ROOMS}$"), room_command))
    application.add_handler(MessageHandler(filters.Regex(f"^{BUTTON_TODAY_RESULT}$"), result_command))
    application.add_handler(MessageHandler(filters.Regex(f"^{BUTTON_MY_RANK}$"), rank_command))
    application.add_handler(MessageHandler(filters.Regex(f"^{BUTTON_HELP}$"), help_command))
    return application


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        application = build_application()
    except RuntimeError as exc:
        if str(exc) != "TELEGRAM_BOT_TOKEN_MISSING":
            raise
        logger.warning("TELEGRAM_BOT_TOKEN is not configured; telegram-bot service is idling.")
        while True:
            time.sleep(3600)

    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
