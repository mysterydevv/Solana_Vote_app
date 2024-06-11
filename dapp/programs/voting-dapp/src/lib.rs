use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Burn, Token, TokenAccount};

declare_id!("6jMfnKUS87gQncgcsoPqtXGUz8nxAXDu49btxH4CPfs8");

#[program]
pub mod voting_dapp {
    use super::*;

    pub fn init_post(ctx: Context<InitPost>, name: String) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        let authority = &mut ctx.accounts.authority;
        post_account.name = name;
        post_account.vote_count = 0;
        post_account.comment_count = 0;
        post_account.authority = authority.key();
        post_account.timestamp = ctx.accounts.clock.unix_timestamp;

        Ok(())
    }

    pub fn create_comment(ctx: Context<CreateComment>, content: String) -> Result<()> {
        let comment_account = &mut ctx.accounts.comment_account;
        let post_account = &mut ctx.accounts.post_account;
        let authority = &mut ctx.accounts.authority;

        comment_account.user = authority.key();
        comment_account.content = content;
        comment_account.timestamp = ctx.accounts.clock.unix_timestamp;

        comment_account.name = post_account.name.clone();
        comment_account.id = post_account.key();
        post_account.comment_count += 1;

        Ok(())
    }

    pub fn vote_post(ctx: Context<VotePost>) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        post_account.vote_count += 1;
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::mint_to(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.account.to_account_info(),
            authority: ctx.accounts.account_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::burn(cpi_ctx, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    /// CHECK: This is not dangerous because we are only using it as a signer to authorize the minting
    #[account(signer)]
    pub mint_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub account: Account<'info, TokenAccount>,
    /// CHECK: This is not dangerous because we are only using it as a signer to authorize the burning
    #[account(signer)]
    pub account_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitPost<'info> {
    #[account(
        init,
        payer = authority,
        space = 294 + 8,
    )]
    pub post_account: Account<'info, PostAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct CreateComment<'info> {
    #[account(
        init,
        payer = authority,
        space = 536 + 8,
    )]
    pub comment_account: Account<'info, CommentAccount>,
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct VotePost<'info> {
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
}

#[account]
pub struct PostAccount {
    pub name: String,
    pub authority: Pubkey,
    pub vote_count: u8,
    pub comment_count: u8,
    pub timestamp: i64,
}

#[account]
pub struct CommentAccount {
    pub name: String,
    pub user: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub id: Pubkey,
}
