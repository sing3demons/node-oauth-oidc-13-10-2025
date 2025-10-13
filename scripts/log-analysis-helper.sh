#!/bin/bash
# Log Analysis Helper Scripts
# ตัวอย่างคำสั่งสำหรับการวิเคราะห์ logs ที่แยกไฟล์

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TODAY=$(date +%Y-%m-%d)

echo -e "${BLUE}=== OAuth2 Server Log Analysis Helper ===${NC}\n"

# ============================================
# 1. SUMMARY LOGS - Quick Overview
# ============================================
echo -e "${GREEN}1. Summary Logs (Quick Overview)${NC}"

echo -e "\n${YELLOW}View today's summary logs:${NC}"
echo "cat logs/summary-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Count successful operations:${NC}"
echo "cat logs/summary-$TODAY.log | jq 'select(.details.success==true)' | wc -l"

echo -e "\n${YELLOW}Count failed operations:${NC}"
echo "cat logs/summary-$TODAY.log | jq 'select(.details.success==false)' | wc -l"

echo -e "\n${YELLOW}Calculate success rate:${NC}"
cat << 'EOF'
TOTAL=$(cat logs/summary-$TODAY.log | wc -l)
SUCCESS=$(cat logs/summary-$TODAY.log | jq 'select(.details.success==true)' | wc -l)
echo "Success Rate: $(($SUCCESS * 100 / $TOTAL))%"
EOF

echo -e "\n${YELLOW}Average response time:${NC}"
echo "cat logs/summary-$TODAY.log | jq '.details.duration' | jq -s 'add/length'"

echo -e "\n${YELLOW}Summary by context:${NC}"
cat << 'EOF'
cat logs/summary-$TODAY.log | \
  jq -r '.context' | \
  sort | uniq -c | sort -rn
EOF

# ============================================
# 2. DETAIL LOGS - Deep Analysis
# ============================================
echo -e "\n${GREEN}2. Detail Logs (Deep Analysis)${NC}"

echo -e "\n${YELLOW}View today's detail logs:${NC}"
echo "cat logs/detail-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Find slowest operations (Top 10):${NC}"
cat << 'EOF'
cat logs/detail-$TODAY.log | \
  jq '{operation: .details.operation, duration: .details.duration, context: .context}' | \
  jq -s 'sort_by(.duration) | reverse | .[0:10]'
EOF

echo -e "\n${YELLOW}Detail logs for specific operation:${NC}"
echo "cat logs/detail-$TODAY.log | jq 'select(.details.operation==\"generate\")'"

echo -e "\n${YELLOW}Detail logs for specific client:${NC}"
echo "cat logs/detail-$TODAY.log | jq 'select(.details.clientId==\"test-client-1\")'"

echo -e "\n${YELLOW}Detail logs for specific user:${NC}"
echo "cat logs/detail-$TODAY.log | jq 'select(.details.userId==\"user-123\")'"

# ============================================
# 3. COMBINED ANALYSIS - Summary + Detail
# ============================================
echo -e "\n${GREEN}3. Combined Analysis (Summary + Detail)${NC}"

echo -e "\n${YELLOW}Trace complete request flow by correlation ID:${NC}"
cat << 'EOF'
CORRELATION_ID="abc-123"  # Replace with actual ID

echo "=== SUMMARY ==="
cat logs/summary-$TODAY.log | \
  jq --arg id "$CORRELATION_ID" 'select(.correlationId==$id)'

echo "=== DETAILS ==="
cat logs/detail-$TODAY.log | \
  jq --arg id "$CORRELATION_ID" 'select(.correlationId==$id)'
EOF

echo -e "\n${YELLOW}Compare summary vs detail count:${NC}"
cat << 'EOF'
echo "Summary logs: $(cat logs/summary-$TODAY.log | wc -l)"
echo "Detail logs: $(cat logs/detail-$TODAY.log | wc -l)"
echo "Total logs: $(cat logs/application-$TODAY.log | wc -l)"
EOF

# ============================================
# 4. ERROR LOGS - Error Tracking
# ============================================
echo -e "\n${GREEN}4. Error Logs (Error Tracking)${NC}"

echo -e "\n${YELLOW}View today's errors:${NC}"
echo "cat logs/error-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Count errors by context:${NC}"
echo "cat logs/error-$TODAY.log | jq -r '.context' | sort | uniq -c | sort -rn"

echo -e "\n${YELLOW}Most common error messages:${NC}"
echo "cat logs/error-$TODAY.log | jq -r '.errorMessage' | sort | uniq -c | sort -rn | head -10"

echo -e "\n${YELLOW}Errors with stack traces:${NC}"
echo "cat logs/error-$TODAY.log | jq 'select(.errorStack) | {timestamp, message, errorStack}'"

# ============================================
# 5. AUDIT LOGS - OAuth Compliance
# ============================================
echo -e "\n${GREEN}5. Audit Logs (OAuth Compliance)${NC}"

echo -e "\n${YELLOW}View today's audit logs:${NC}"
echo "cat logs/audit-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}OAuth operations count:${NC}"
echo "cat logs/audit-$TODAY.log | jq -r '.operation' | sort | uniq -c | sort -rn"

echo -e "\n${YELLOW}Failed OAuth operations:${NC}"
echo "cat logs/audit-$TODAY.log | jq 'select(.success==false)'"

echo -e "\n${YELLOW}Token generations today:${NC}"
echo "cat logs/audit-$TODAY.log | jq 'select(.operation==\"token_exchange\")' | wc -l"

# ============================================
# 6. REAL-TIME MONITORING
# ============================================
echo -e "\n${GREEN}6. Real-time Monitoring${NC}"

echo -e "\n${YELLOW}Watch summary logs in real-time:${NC}"
echo "tail -f logs/summary-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Watch detail logs in real-time:${NC}"
echo "tail -f logs/detail-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Watch errors in real-time:${NC}"
echo "tail -f logs/error-$TODAY.log | jq '.'"

echo -e "\n${YELLOW}Watch specific context (e.g., auth):${NC}"
echo "tail -f logs/summary-$TODAY.log | jq 'select(.context==\"auth\")'"

# ============================================
# 7. PERFORMANCE ANALYSIS
# ============================================
echo -e "\n${GREEN}7. Performance Analysis${NC}"

echo -e "\n${YELLOW}Average response time by endpoint:${NC}"
cat << 'EOF'
cat logs/summary-$TODAY.log | \
  jq 'select(.context=="http") | {url: .details.url, duration: .details.duration}' | \
  jq -s 'group_by(.url) | map({
    endpoint: .[0].url,
    avg_duration: (map(.duration) | add / length),
    count: length
  })'
EOF

echo -e "\n${YELLOW}Database query performance:${NC}"
cat << 'EOF'
cat logs/detail-$TODAY.log | \
  jq 'select(.context=="database") | {
    collection: .details.collection,
    operation: .details.operation,
    duration: .details.duration
  }' | \
  jq -s 'group_by(.collection) | map({
    collection: .[0].collection,
    avg_duration: (map(.duration) | add / length),
    queries: length
  })'
EOF

# ============================================
# 8. SECURITY ANALYSIS
# ============================================
echo -e "\n${GREEN}8. Security Analysis${NC}"

echo -e "\n${YELLOW}Failed authentication attempts:${NC}"
echo "cat logs/summary-$TODAY.log | jq 'select(.context==\"auth\" and .details.success==false)'"

echo -e "\n${YELLOW}Failed logins by IP:${NC}"
cat << 'EOF'
cat logs/detail-$TODAY.log | \
  jq 'select(.context=="auth" and .details.success==false) | {
    ip: .details.ipAddress,
    username: .details.username
  }' | \
  jq -s 'group_by(.ip) | map({
    ip: .[0].ip,
    failed_attempts: length,
    users: map(.username) | unique
  })'
EOF

echo -e "\n${YELLOW}Security events:${NC}"
echo "cat logs/application-$TODAY.log | jq 'select(.context==\"security\")'"

# ============================================
# 9. FILE SIZE ANALYSIS
# ============================================
echo -e "\n${GREEN}9. File Size Analysis${NC}"

echo -e "\n${YELLOW}Check log file sizes today:${NC}"
cat << 'EOF'
echo "Summary: $(du -h logs/summary-$TODAY.log 2>/dev/null || echo 'N/A')"
echo "Detail: $(du -h logs/detail-$TODAY.log 2>/dev/null || echo 'N/A')"
echo "Error: $(du -h logs/error-$TODAY.log 2>/dev/null || echo 'N/A')"
echo "Audit: $(du -h logs/audit-$TODAY.log 2>/dev/null || echo 'N/A')"
echo "Application: $(du -h logs/application-$TODAY.log 2>/dev/null || echo 'N/A')"
EOF

echo -e "\n${YELLOW}Total logs directory size:${NC}"
echo "du -sh logs/"

echo -e "\n${YELLOW}Disk usage by file type:${NC}"
cat << 'EOF'
echo "Summary files: $(du -ch logs/summary-*.log 2>/dev/null | tail -1)"
echo "Detail files: $(du -ch logs/detail-*.log 2>/dev/null | tail -1)"
echo "Error files: $(du -ch logs/error-*.log 2>/dev/null | tail -1)"
echo "Audit files: $(du -ch logs/audit-*.log 2>/dev/null | tail -1)"
EOF

# ============================================
# 10. CLEANUP & MAINTENANCE
# ============================================
echo -e "\n${GREEN}10. Cleanup & Maintenance${NC}"

echo -e "\n${YELLOW}List old log files:${NC}"
echo "find logs/ -name '*.log' -mtime +14"

echo -e "\n${YELLOW}Compress old logs:${NC}"
echo "find logs/ -name '*.log' -mtime +14 -exec gzip {} \\;"

echo -e "\n${YELLOW}Delete very old logs:${NC}"
echo "find logs/ -name '*.log.gz' -mtime +90 -delete"

echo -e "\n${YELLOW}Archive logs to S3:${NC}"
echo "aws s3 sync logs/ s3://my-bucket/oauth2-logs/ --exclude '*.log' --include '*.log.gz'"

# ============================================
echo -e "\n${BLUE}=== End of Helper Scripts ===${NC}"
echo -e "${YELLOW}Tip: Copy and modify these commands for your needs!${NC}\n"
