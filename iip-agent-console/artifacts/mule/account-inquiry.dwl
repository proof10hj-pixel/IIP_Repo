%dw 2.0
output application/json
// account-inquiry.dwl (Generated)
var src = payload
---
{
  accountNo: src.acct_no as String,
  balance: src.bal as Number,
  currency: src.ccy as String,
  status: upper(src.acct_status as String),
  asOfDate: src.as_of as String
}