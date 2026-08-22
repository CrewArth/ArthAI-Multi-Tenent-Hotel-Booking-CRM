import CounterModel from '../models/Counter.js';

const PREFIX_MAP = {
  guesthouse: 'GH',
  room:       'RM',
  bed:        'BD',
  booking:    'BK',
  user:       'USR',
};

const pad = (n, width = 3) => String(n).padStart(width, '0');

const getPrefix = (type) => {
  const key = type.toLowerCase();
  if (PREFIX_MAP[key]) return PREFIX_MAP[key];

  return key
    .replace(/[aeiou]/g, '')
    .slice(0, 3)
    .toUpperCase()
    || key.slice(0, 3).toUpperCase();
};

export const generateId = async (type, tenantDbOrCounter = null) => {
  const prefix = getPrefix(type);
  const counterId = `counter_${type.toLowerCase()}`;

  let Counter = CounterModel;
  if (tenantDbOrCounter?.model) {
    Counter = tenantDbOrCounter.model('Counter');
  } else if (tenantDbOrCounter?.models?.Counter) {
    Counter = tenantDbOrCounter.models.Counter;
  }

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}${pad(counter.seq)}`;
};
