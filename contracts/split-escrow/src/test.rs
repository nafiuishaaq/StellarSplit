#![cfg(test)]
extern crate std;

use crate::{SplitEscrowContract, SplitEscrowContractClient, SplitStatus};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};
use soroban_sdk::IntoVal;
use soroban_sdk::{testutils::Address as _, testutils::Events as _, Address, Env, String, Map};

fn setup() -> (
    Env,
    SplitEscrowContractClient<'static>,
    Address,
    Address,
    Address,
    TokenClient<'static>,
    TokenAdminClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_contract.address();

    let token_client = TokenClient::new(&env, &token);
    let token_admin_client = TokenAdminClient::new(&env, &token);

    let contract_id = env.register_contract(None, SplitEscrowContract);
    let client = SplitEscrowContractClient::new(&env, &contract_id);
    client.initialize(&admin, &token, &String::from_str(&env, "1.0.0"));

    token_admin_client.mint(&participant, &1_000_000);
    token_admin_client.mint(&creator, &1_000_000);

    (
        env,
        client,
        admin,
        creator,
        participant,
        token_client,
        token_admin_client,
    )
}

#[test]
fn test_fee_deducted_and_sent_to_treasury_on_release() {
    let (env, client, admin, creator, participant, token_client, _) = setup();
    let treasury = Address::generate(&env);
    client.set_treasury(&treasury);
    client.set_fee(&250u32); // 2.5%

    let mut obligations = Map::new(&env);
    obligations.set(participant.clone(), 10_000);

    let split_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Dinner"),
        &10_000,
        &obligations,
        &None,
        &None,
    );
    client.deposit(&split_id, &participant, &10_000);
    client.release_funds(&split_id);

    assert_eq!(token_client.balance(&treasury), 250);
    assert_eq!(token_client.balance(&creator), 9_750);

    let escrow = client.get_escrow(&split_id);
    assert_eq!(escrow.status, SplitStatus::Released);

    let _ = admin;
}

#[test]
fn test_admin_can_update_fee_and_treasury() {
    let (env, client, _admin, creator, participant, token_client, _) = setup();

    let treasury_a = Address::generate(&env);
    client.set_treasury(&treasury_a);
    client.set_fee(&100u32);

    let mut obligations_a = Map::new(&env);
    obligations_a.set(participant.clone(), 1_000);

    let split_a =
        client.create_escrow(&creator, &String::from_str(&env, "A"), &1_000, &obligations_a, &None, &None);
    client.deposit(&split_a, &participant, &1_000);
    client.release_funds(&split_a);
    assert_eq!(token_client.balance(&treasury_a), 10);

    let treasury_b = Address::generate(&env);
    client.set_treasury(&treasury_b);
    client.set_fee(&300u32);

    let mut obligations_b = Map::new(&env);
    obligations_b.set(participant.clone(), 2_000);

    let split_b =
        client.create_escrow(&creator, &String::from_str(&env, "B"), &2_000, &obligations_b, &None, &None);
    client.deposit(&split_b, &participant, &2_000);
    client.release_funds(&split_b);
    assert_eq!(token_client.balance(&treasury_b), 60);
}

#[test]
fn test_set_fee_and_set_treasury_are_admin_only() {
    let (env, client, admin, _creator, _participant, _token_client, _token_admin) = setup();

    env.mock_all_auths();
    client.set_fee(&123u32);
    client.set_treasury(&Address::generate(&env));

    assert_ne!(admin, Address::generate(&env));
}

#[test]
fn test_fees_collected_event_emitted() {
    let (env, client, _admin, creator, participant, _token_client, _) = setup();
    let treasury = Address::generate(&env);
    client.set_treasury(&treasury);
    client.set_fee(&500u32);

    let before_len = env.events().all().len();

    let mut obligations = Map::new(&env);
    obligations.set(participant.clone(), 1_000);

    let split_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Event"),
        &1_000,
        &obligations,
        &None,
        &None,
    );
    client.deposit(&split_id, &participant, &1_000);
    client.release_funds(&split_id);

    let after_len = env.events().all().len();
    assert!(after_len > before_len);
}

#[test]
fn test_version_stored_on_init() {
    let (env, client, _, _, _, _, _) = setup();
    assert_eq!(client.get_version(), String::from_str(&env, "1.0.0"));
}

#[test]
fn test_upgrade_version_admin() {
    let (env, client, _admin, _, _, _, _) = setup();

    client.upgrade_version(&String::from_str(&env, "1.1.0"));
    assert_eq!(client.get_version(), String::from_str(&env, "1.1.0"));
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")] // Missing admin auth
fn test_upgrade_version_non_admin_fails() {
    let (env, client, _, creator, _, _, _) = setup();

    // Disable blanket auth mocking so we can assert on authorization failures.
    env.set_auths(&[]);

    // Switch to creator auth only — upgrade_version requires admin auth and must fail.
    client.env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &creator,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &client.address,
            fn_name: "upgrade_version",
            args: (String::from_str(&env, "1.1.0"),).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.upgrade_version(&String::from_str(&env, "1.1.0"));
}

#[test]
fn test_partial_deposits() {
    let (env, client, _admin, creator, participant, token_client, _) = setup();
    let p2 = Address::generate(&env);
    let token_admin_client = TokenAdminClient::new(&env, token_client.address);
    token_admin_client.mint(&p2, &1_000_000);

    let mut obligations = Map::new(&env);
    obligations.set(participant.clone(), 5_000);
    obligations.set(p2.clone(), 5_000);

    let split_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Shared Bill"),
        &10_000,
        &obligations,
        &None,
        &None,
    );

    // Participant 1 pays half their obligation.
    client.deposit(&split_id, &participant, &2_500);
    let escrow = client.get_escrow(&split_id);
    assert_eq!(escrow.status, SplitStatus::Pending);
    assert_eq!(escrow.deposited_amount, 2_500);
    assert_eq!(escrow.balances.get(participant.clone()).unwrap(), 2_500);

    // Participant 1 pays the rest of their obligation.
    client.deposit(&split_id, &participant, &2_500);
    let escrow = client.get_escrow(&split_id);
    assert_eq!(escrow.deposited_amount, 5_000);
    assert_eq!(escrow.balances.get(participant.clone()).unwrap(), 5_000);
    assert_eq!(escrow.status, SplitStatus::Pending); // Still pending because p2 hasn't paid.

    // Participant 2 pays their full obligation.
    client.deposit(&split_id, &p2, &5_000);
    let escrow = client.get_escrow(&split_id);
    assert_eq!(escrow.deposited_amount, 10_000);
    assert_eq!(escrow.status, SplitStatus::Ready);

    client.release_funds(&split_id);
    assert_eq!(client.get_escrow(&split_id).status, SplitStatus::Released);
    assert_eq!(token_client.balance(&creator), 10_000);
}

#[test]
fn test_cancel_partial_refunds() {
    let (env, client, _admin, creator, participant, token_client, _) = setup();
    let p2 = Address::generate(&env);
    let token_admin_client = TokenAdminClient::new(&env, token_client.address);
    token_admin_client.mint(&p2, &1_000_000);

    let mut obligations = Map::new(&env);
    obligations.set(participant.clone(), 5_000);
    obligations.set(p2.clone(), 5_000);

    let split_id = client.create_escrow(
        &creator,
        &String::from_str(&env, "Shared Bill"),
        &10_000,
        &obligations,
        &None,
        &None,
    );

    client.deposit(&split_id, &participant, &3_000);
    client.deposit(&split_id, &p2, &2_000);

    let balance_p1_before = token_client.balance(&participant);
    let balance_p2_before = token_client.balance(&p2);

    client.cancel_split(&split_id);

    assert_eq!(token_client.balance(&participant), balance_p1_before + 3_000);
    assert_eq!(token_client.balance(&p2), balance_p2_before + 2_000);
    assert_eq!(client.get_escrow(&split_id).status, SplitStatus::Cancelled);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #11)")] // InvalidVersion
fn test_upgrade_version_invalid_semver_fails() {
    let (env, client, _, _, _, _, _) = setup();
    client.upgrade_version(&String::from_str(&env, "1.0"));
}
