# v1 — swap generation model to claude-haiku-4-5

Generation model changed from claude-sonnet-4-6 (baseline / current production for task=generate) to claude-haiku-4-5. Prompt, max_tokens (1500), and everything else held identical. Testing whether the ~3x cheaper model holds exercise quality (mathematical correctness, French/Arabic language consistency, difficulty calibration), graded by claude-opus-5.
