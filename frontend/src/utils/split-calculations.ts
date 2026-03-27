import type { SplitMethod, WizardState } from '../types/wizard'

export interface WizardParticipantShare {
  participantId: string
  subtotal: number
  tax: number
  tip: number
  total: number
}

export interface WizardSplitCalculation {
  shares: WizardParticipantShare[]
  grandTotal: number
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function distributeTax(
  participantSubtotal: number,
  totalSubtotal: number,
  totalTax: number,
): number {
  if (totalTax === 0 || totalSubtotal === 0) {
    return 0
  }

  return round(totalTax * (participantSubtotal / totalSubtotal))
}

function distributeTip(
  participantSubtotal: number,
  totalSubtotal: number,
  totalTip: number,
  splitMethod: SplitMethod,
  participantCount: number,
): number {
  if (totalTip === 0) {
    return 0
  }

  if (splitMethod === 'equal') {
    return round(totalTip / participantCount)
  }

  if (totalSubtotal === 0) {
    return round(totalTip / participantCount)
  }

  return round(totalTip * (participantSubtotal / totalSubtotal))
}

function applyRoundingAdjustment(
  shares: WizardParticipantShare[],
  expectedTotal: number,
): WizardParticipantShare[] {
  if (shares.length === 0) {
    return shares
  }

  const calculatedTotal = round(
    shares.reduce((sum, share) => sum + share.total, 0),
  )
  const adjustment = round(expectedTotal - calculatedTotal)
  if (Math.abs(adjustment) < 0.01) {
    return shares
  }

  const targetIndex = shares.reduce(
    (largestIndex, currentShare, currentIndex, allShares) =>
      currentShare.total > allShares[largestIndex].total ? currentIndex : largestIndex,
    0,
  )

  const nextShares = [...shares]
  nextShares[targetIndex] = {
    ...nextShares[targetIndex],
    total: round(nextShares[targetIndex].total + adjustment),
  }

  return nextShares
}

function buildShare(
  participantId: string,
  subtotal: number,
  totalSubtotal: number,
  totalTax: number,
  totalTip: number,
  splitMethod: SplitMethod,
  participantCount: number,
): WizardParticipantShare {
  const roundedSubtotal = round(subtotal)
  const tax = distributeTax(roundedSubtotal, totalSubtotal, totalTax)
  const tip = distributeTip(
    roundedSubtotal,
    totalSubtotal,
    totalTip,
    splitMethod,
    participantCount,
  )

  return {
    participantId,
    subtotal: roundedSubtotal,
    tax,
    tip,
    total: round(roundedSubtotal + tax + tip),
  }
}

export function calculateWizardSplit(
  wizardState: Pick<
    WizardState,
    'splitMethod' | 'participants' | 'items' | 'taxAmount' | 'tipAmount' | 'totalAmount'
  >,
): WizardSplitCalculation {
  const participantIds = wizardState.participants.map((participant) => participant.id)
  const participantCount = participantIds.length
  const totalSubtotal = wizardState.totalAmount
  const totalTax = wizardState.taxAmount
  const totalTip = wizardState.tipAmount
  const expectedTotal = round(totalSubtotal + totalTax + totalTip)

  if (participantCount === 0) {
    return {
      shares: [],
      grandTotal: expectedTotal,
    }
  }

  let shares: WizardParticipantShare[] = []

  switch (wizardState.splitMethod) {
    case 'equal':
      shares = participantIds.map((participantId) =>
        buildShare(
          participantId,
          totalSubtotal / participantCount,
          totalSubtotal,
          totalTax,
          totalTip,
          wizardState.splitMethod,
          participantCount,
        ),
      )
      break
    case 'percentage':
      shares = wizardState.participants.map((participant) =>
        buildShare(
          participant.id,
          (totalSubtotal * (participant.percentage ?? 0)) / 100,
          totalSubtotal,
          totalTax,
          totalTip,
          wizardState.splitMethod,
          participantCount,
        ),
      )
      break
    case 'custom':
      shares = wizardState.participants.map((participant) =>
        buildShare(
          participant.id,
          participant.customAmount ?? 0,
          totalSubtotal,
          totalTax,
          totalTip,
          wizardState.splitMethod,
          participantCount,
        ),
      )
      break
    case 'itemized': {
      const subtotals = new Map<string, number>()
      participantIds.forEach((participantId) => subtotals.set(participantId, 0))

      wizardState.items.forEach((item) => {
        const assignedIds =
          item.assignedTo.length > 0 ? item.assignedTo : participantIds
        const sharePerPerson = item.price / Math.max(assignedIds.length, 1)

        assignedIds.forEach((participantId) => {
          subtotals.set(
            participantId,
            (subtotals.get(participantId) ?? 0) + sharePerPerson,
          )
        })
      })

      shares = participantIds.map((participantId) =>
        buildShare(
          participantId,
          subtotals.get(participantId) ?? 0,
          totalSubtotal,
          totalTax,
          totalTip,
          wizardState.splitMethod,
          participantCount,
        ),
      )
      break
    }
  }

  return {
    shares: applyRoundingAdjustment(shares, expectedTotal),
    grandTotal: expectedTotal,
  }
}
