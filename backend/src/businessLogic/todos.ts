import 'source-map-support/register';
import * as uuid from 'uuid';

import { TodoItem } from '../models/TodoItem';
import { TodoUpdate } from '../models/TodoUpdate';
import { TodosAccess } from '../dataLayer/todosAccess';
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'

import { createLogger } from '../utils/logger';

const logger = createLogger('todos');
const todosAccess = new TodosAccess();

export async function getTodos(userId: string): Promise<TodoItem[]> {
  logger.info(`Retrieving todos for user: ${userId}`);

  return await todosAccess.getTodoItems(userId);
}

export async function createTodo(userId: string, createTodoRequest: CreateTodoRequest): Promise<TodoItem> {
  const todoId: string = uuid.v4();

  const newTodo: TodoItem = {
    userId,
    todoId,
    createdAt: new Date().toISOString(),
    done: false,
    attachmentUrl: null,
    ...createTodoRequest
  }

  logger.info(`Adding new todo: ${todoId} for user: ${userId}`);

  await todosAccess.createTodoItem(newTodo);

  return newTodo;
}

export async function updateTodo(userId: string, todoId: string, updateTodoRequest: UpdateTodoRequest) {
  logger.info(`Updating todo: ${todoId} for user: ${userId}`);

  const todo = await todosAccess.getTodoItem(todoId);

  if (!todo) { 
    logger.error(`No todo found for todoId: ${todoId}`);
    throw new Error('No todo found');
  }

  if (todo.userId !== userId) {
    logger.error(`Permission error: User: ${userId} is not authorized to update this todo: ${todoId}.`);
    throw new Error('Permission error: User is not authorized to update this todo.');
  }

  todosAccess.updateTodoItem(todoId, updateTodoRequest as TodoUpdate);
}

export async function deleteTodo(userId: string, todoId: string) {
  logger.info(`Deleting todo: ${todoId} for user: ${userId}`);

  const todoToDelete = await todosAccess.getTodoItem(todoId);

  if (!todoToDelete) { 
    logger.error(`No todo found for todoId: ${todoId}`);
    throw new Error('No todo found');
  }

  if (todoToDelete.userId !== userId) {
    logger.error(`Permission error: User: ${userId} is not authorized to delete this todo: ${todoId}.`);
    throw new Error('Permission error: User is not authorized to delete this todo.');
  }

  todosAccess.deleteTodoItem(todoId);
}

export async function updateAttachmentUrl(userId: string, todoId: string, attachmentId: string) {
  logger.info(`Creating the attachment URL for attachment: ${attachmentId}`);

  const attachmentUrl = await todosAccess.getAttachmentUrl(attachmentId);

  logger.info(`Updating the todo: ${todoId} with attachment URL: ${attachmentUrl}`);

  const todo = await todosAccess.getTodoItem(todoId);

  if (!todo) { 
    logger.error(`No todo found for todoId: ${todoId}`);
    throw new Error('No todo found');
  }

  if (todo.userId !== userId) {
    logger.error(`Permission error: User: ${userId} is not authorized to update this todo: ${todoId}.`);
    throw new Error('Permission error: User is not authorized to update this todo.');
  }

  await todosAccess.updateAttachmentUrl(todoId, attachmentUrl);
}

export async function generateUploadUrl(attachmentId: string): Promise<string> {
  logger.info(`Generating upload URL for attachment: ${attachmentId}`);

  return await todosAccess.getUploadUrl(attachmentId);
}
