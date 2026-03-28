import { generateSuggestions, snoozeSettlement, unsnoozeSettlement } from "../settlement.service";
import { userRepo } from "../settlement.repository";

describe("Settlement Service", () => {
  it("should generate completed suggestion when balances net to zero", async () => {
    // mock participants with zero balances
    const suggestions = await generateSuggestions();
    expect(suggestions[0].status).toBe("completed");
  });

  it("should persist snooze state", async () => {
    const userId = "test-user";
    const until = new Date(Date.now() + 3600 * 1000);
    await snoozeSettlement(userId, until);
    const user = await userRepo.findOneBy({ id: userId });
    expect(user?.snoozedUntil).toEqual(until);
  });

  it("should clear snooze state", async () => {
    const userId = "test-user";
    await unsnoozeSettlement(userId);
    const user = await userRepo.findOneBy({ id: userId });
    expect(user?.snoozedUntil).toBeNull();
  });
});
