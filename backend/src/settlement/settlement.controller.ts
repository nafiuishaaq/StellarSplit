import { Router } from "express";
import { generateSuggestions, snoozeSettlement, unsnoozeSettlement, verifySettlement } from "./settlement.service";

const router = Router();

router.get("/suggestions", async (req, res) => {
  const suggestions = await generateSuggestions();
  res.json(suggestions);
});

router.post("/snooze", async (req, res) => {
  const { userId, until } = req.body;
  await snoozeSettlement(userId, new Date(until));
  res.json({ success: true });
});

router.post("/unsnooze", async (req, res) => {
  const { userId } = req.body;
  await unsnoozeSettlement(userId);
  res.json({ success: true });
});

router.post("/verify", async (req, res) => {
  const { user, asset, amount } = req.body;
  const verified = await verifySettlement(user, asset, amount);
  res.json({ verified });
});

export default router;
import { Controller, Get, Post, Put, Body, Param, Req } from "@nestjs/common";
import { SuggestionEngineService } from "./suggestion-engine.service";
import { SettlementService } from "./settlement.service";

@Controller("settlement")
export class SettlementController {
  constructor(
    private readonly suggestionEngine: SuggestionEngineService,
    private readonly settlementService: SettlementService,
  ) {}

  @Get("suggestions")
  async getSuggestions(@Req() req: any) {
    return this.suggestionEngine.generateSuggestions(
      req.user.id,
      req.user.walletAddress,
    );
  }

  @Post("suggestions/refresh")
  async refresh(@Req() req: any) {
    return this.suggestionEngine.generateSuggestions(
      req.user.id,
      req.user.walletAddress,
    );
  }

  @Get("net-position")
  async getNetPosition(@Req() req: any) {
    return this.settlementService.calculateNetPosition(req.user.walletAddress);
  }

  @Post("suggestions/snooze")
  async snooze(@Req() req: any) {
    return this.settlementService.snoozeSuggestions(req.user.id);
  }

  @Put("steps/:stepId/complete")
  async completeStep(
    @Param("stepId") stepId: string,
    @Body("txHash") txHash: string,
    @Req() req: any,
  ) {
    // This triggers the Stellar verification and updates split/participant status
    return this.settlementService.verifyAndCompleteStep(
      stepId,
      txHash,
      req.user.walletAddress,
    );
  }
}
