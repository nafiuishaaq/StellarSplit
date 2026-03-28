import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";

export const userRepo = AppDataSource.getRepository(User);

export async function findActiveParticipants(): Promise<User[]> {
  const now = new Date();
  return userRepo.find({
    where: [
      { snoozedUntil: null },
      { snoozedUntil: { $lt: now } }
    ]
  });
}

export async function updateSnooze(userId: string, untilDate: Date) {
  await userRepo.update(userId, { snoozedUntil: untilDate });
}

export async function clearSnooze(userId: string) {
  await userRepo.update(userId, { snoozedUntil: null });
}
