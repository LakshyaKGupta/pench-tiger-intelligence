# Skill: SaaS Startup Technical Advisor

Use this skill when designing B2B SaaS architecture, developer platforms, pricing/billing models, or multi-tenant database systems. Focus on time-to-first-value and secure isolation.

## 1. Product-Market Fit Signals

Before building features, ask:
- **Who specifically pays for this?** (Job title, company size, industry)
- **What is the unit of value?** (What do they get that they'll pay for?)
- **What is the before/after state?** (What is harder without this product?)
- **What's the retention mechanism?** (Why won't they cancel after 30 days?)

## 2. YC-Style Product Audit

Run these questions on every major feature:
1. Does this make the core product better for the best customers?
2. Does this shorten the time to first value?
3. Does this increase retention or reduce churn?
4. Does this increase revenue from existing customers?

If the answer is "no" to all four, the feature is probably a distraction.

## 3. Pricing for Developer/Security Products

**Recommended model for AI security platforms:**

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0 | 1 agent, 1,000 screened requests/month |
| Pro | $49/mo | 5 agents, 100K requests, basic analytics |
| Team | $199/mo | 25 agents, 1M requests, audit export, RBAC |
| Enterprise | Custom | Unlimited, SSO, SLA, on-prem, compliance reports |

**Metering hook (FastAPI + Stripe):**
```python
@router.post("/v1/screen")
async def screen_prompt(request: ScreenRequest, org: Org = Depends(get_org)):
    # Check quota before doing work
    if org.requests_this_month >= org.plan.monthly_limit:
        raise HTTPException(429, "Monthly request quota exceeded")
    
    verdict = await classify(request.prompt)
    
    # Increment usage meter
    await stripe.billing.meter_events.create(
        event_name="agent_request_screened",
        payload={"value": "1", "stripe_customer_id": org.stripe_customer_id}
    )
    return verdict
```

## 4. Onboarding Funnel (Developer Products)

**Time-to-First-Value target: < 5 minutes**

```
Sign Up → Create Org → Register Agent → Get SDK Key → First Protected Call → See Ledger Entry
```

Each step should:
- Have exactly ONE action.
- Show clear progress.
- Never ask for information not needed for THIS step.
- Confirm success with visible evidence (not just "It worked").

## 5. Multi-Tenancy Architecture

```
org_id (UUID, from JWT)
  ├── agents[] (belongs to org)
  ├── api_keys[] (belongs to org, scoped to org)
  ├── ledger[] (belongs to org, Row Level Security)
  └── threats[] (belongs to org)
```

PostgreSQL RLS enforces isolation at DB level — not just in app code.

## 6. B2B SaaS Metrics That Matter

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to First Value | < 5 min | avg(first_sdk_call - signup) |
| Day-7 Retention | > 60% | DAU/cohort analysis |
| Monthly Churn | < 2% | cancelled_this_month / start_of_month |
| NPS | > 40 | In-app survey at day 30 |
| Revenue per Agent | Track | MRR / total_active_agents |

## 7. Launch Readiness Checklist

**Technical:**
- [ ] Auth works for signup, login, password reset
- [ ] Rate limiting on all public endpoints
- [ ] Error messages don't expose internal state
- [ ] Stripe billing configured (even if free tier)
- [ ] Health check + uptime monitoring
- [ ] Rollback plan documented

**Product:**
- [ ] "Why should I use this?" answered in 10 seconds on homepage
- [ ] One-click signup (GitHub OAuth recommended for devs)
- [ ] Empty state tells user exactly what to do next
- [ ] First value achievable without contacting support

**Legal:**
- [ ] Privacy policy covers what data you store and why
- [ ] Terms of service cover agent data and AI outputs
- [ ] GDPR delete-my-data endpoint exists

## 8. What NOT to Build in Month 1

- Multi-language SDK (build one language, do it perfectly)
- Custom dashboards / analytics (use Mixpanel or Amplitude)
- Real-time notifications (polling is fine for MVP)
- Admin panel (use direct DB queries)
- Team/organization management UI (API-only is fine)
- Mobile app (desktop-first, always)
