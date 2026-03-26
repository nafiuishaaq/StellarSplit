use soroban_sdk::{contracttype, Address, String, Vec};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum DisputeStatus {
    Open,
    Voting,
    Resolved,
    Cancelled,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DisputeResult {
    UpheldForRaiser,    // Dispute was valid, raiser wins
    DismissedForRaiser, // Dispute was invalid, original split stands
    Tied,               // Equal votes, default to original split
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub dispute_id: String,
    pub split_id: String,
    pub raiser: Address,
    pub reason: String,
    pub status: DisputeStatus,
    pub votes_for: u32,     // votes supporting the dispute
    pub votes_against: u32, // votes dismissing the dispute
    pub voters: Vec<Address>,
    pub created_at: u64,
    pub voting_ends_at: u64, // voting window: 7 days
    pub result: Option<u32>,
    /// Escrow contract holding the funds for this split (so resolution can drive settlement).
    pub escrow_contract: Address,
    pub escrow_split_id: u64,
}

#[contracttype]
pub enum DataKey {
    Dispute(String),
    DisputeList,
    VoterRecord(String, Address), // (dispute_id, voter) -> bool (has voted)
}
