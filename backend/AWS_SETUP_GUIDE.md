# AWS Bedrock Setup Guide for Study Plan Generation

## Current Status
The study plan generation is currently using **enhanced fallback responses** instead of real LLM generation because AWS credentials are set to dummy values.

## Why This Happens
The system checks for valid AWS credentials and falls back to a comprehensive educational response system when:
- AWS credentials are not set
- AWS credentials are set to dummy/placeholder values
- AWS credentials are invalid

## To Enable Real LLM Generation

### Step 1: Get AWS Credentials
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to IAM (Identity and Access Management)
3. Create a new user or use existing user
4. Attach the `AmazonBedrockFullAccess` policy
5. Generate access keys (Access Key ID and Secret Access Key)

### Step 2: Update Environment Variables
Edit the `.env` file in the backend directory:

```env
# Replace these dummy values with your real AWS credentials
AWS_ACCESS_KEY_ID=your_real_access_key_here
AWS_SECRET_ACCESS_KEY=your_real_secret_key_here
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Step 3: Restart Backend Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
python api_routes.py
```

### Step 4: Test Real LLM Generation
The system will now use AWS Bedrock Claude-3-Sonnet model to generate personalized study plans based on:
- Student's specific topics
- Grade level
- Study preferences
- Exam timeline
- Subject-specific content

## Current Fallback System
Even without AWS credentials, the system provides:
- ✅ Detailed topic information
- ✅ Personalized study schedules
- ✅ Subject-specific content (Physics, Chemistry, etc.)
- ✅ Study strategies and recommendations
- ✅ Topic prioritization

## Verification
After setting up real credentials, you should see:
- `🤖 Calling AWS Bedrock with model: anthropic.claude-3-sonnet-20240229-v1:0`
- `✅ Received response from Bedrock`
- `✅ Successfully parsed JSON response from Bedrock`

Instead of:
- `⚠️ AWS credentials not configured or set to dummy values`
- `⚠️ Using enhanced fallback study plan generation`

## Frontend Integration
The frontend is properly integrated and will display the generated study plan regardless of whether it comes from:
- Real AWS Bedrock LLM (more personalized and dynamic)
- Enhanced fallback system (comprehensive but static)

Both provide the same JSON structure and UI components.

