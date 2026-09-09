import Joi from 'joi';

export const createRoomSchema = Joi.object({
  guestHouseId: Joi.string().required(),
  roomNumber: Joi.number().integer().min(1).required(),
  roomType: Joi.string().trim().min(1).max(50).required(),
  roomCapacity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).optional().allow('', null),
  discountPercentage: Joi.number().min(0).max(100).optional().allow('', null),
  isAvailable: Joi.boolean().optional()
});

export const updateRoomSchema = Joi.object({
  roomNumber: Joi.number().integer().min(1).optional(),
  roomType: Joi.string().trim().min(1).max(50).optional(),
  roomCapacity: Joi.number().integer().min(1).optional(),
  price: Joi.number().min(0).optional().allow('', null),
  discountPercentage: Joi.number().min(0).max(100).optional().allow('', null),
  isAvailable: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
}).min(1); // must update at least one field

export const listRoomsQuerySchema = Joi.object({
  guestHouseId: Joi.string().optional(),
  roomType: Joi.string().trim().optional(),
  isAvailable: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('createdAt', 'roomNumber', 'roomType', 'roomCapacity').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});
