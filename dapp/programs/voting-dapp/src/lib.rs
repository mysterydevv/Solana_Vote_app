use anchor_lang::prelude::*;

declare_id!("8nPBggtVczfFRYtjidQSJaagUK58xCJyPUCACEwhKdaJ");

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

        // Connect the comment to the post
        comment_account.name = post_account.name.clone();
        comment_account.id = post_account.key();
        // Increment the comment count of the post
        post_account.comment_count += 1;

        Ok(())
    }


    pub fn vote_post(ctx: Context<VotePost>) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        post_account.vote_count += 1;
        Ok(())
    }


}


#[derive(Accounts)]
#[instruction(description: String)] // Add description field
pub struct InitPost<'info> {
    #[account(
        init,
        payer = authority,
        space = 294 + 8, // Update space to accommodate description
    )]
    pub post_account: Account<'info, PostAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>, // Add the clock sysvar
}


#[derive(Accounts)]
#[instruction()]
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
    pub clock: Sysvar<'info, Clock>, // Add the clock sysvar
}


#[derive(Accounts)]
pub struct VotePost<'info> {
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
}

#[account]
pub struct PostAccount {
    pub name: String, // 4+256
    pub description: String, // Add description field
    pub authority: Pubkey, // 32
    pub vote_count: u8, // 1
    pub comment_count: u8,
    pub timestamp: i64, // Use i64 for timestamp
}


#[account]
pub struct CommentAccount {
    pub name: String, // 4+256
    pub user: Pubkey, // 32
    pub content: String, // 4+256
    pub timestamp: i64, // Use i64 for timestamp
    pub id: Pubkey, //
}