
# Weekly Super Summarizer Edge Function

This edge function processes weekly chunk summaries for each user and generates a comprehensive super summary.

## Features

- Runs every Sunday at 06:00 UTC (midnight Central Time)
- Processes chunks from the past 7 days
- Maintains user data isolation
- Includes retry logic with exponential backoff
- Uses transactions for data consistency
- Comprehensive error handling and logging

## Process Flow

1. Fetches all users with chunks to process
2. For each user:
   - Retrieves their chunks from the past week
   - Processes chunks into a super summary
   - Creates new super summary record
   - Deletes processed chunks
3. Includes retry logic for failed operations

## Error Handling

- Maximum 3 retries per user with exponential backoff
- Continues processing other users if one fails
- Comprehensive error logging
