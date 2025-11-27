# Incident Runbooks

Quick reference guides for responding to common production incidents.

## Available Runbooks

1. [Database Down](./database-down.md) - Database connectivity issues
2. [Redis Down](./redis-down.md) - Redis/queue connectivity issues
3. [Worker Stuck](./worker-stuck.md) - Background worker not processing jobs
4. [High Traffic](./high-traffic.md) - Traffic spike handling
5. [Security Incident](./security-incident.md) - Security breach response

## How to Use Runbooks

1. **Identify the incident type** based on symptoms
2. **Follow the runbook step-by-step** - don't skip steps
3. **Document everything you do** in incident log
4. **Update the runbook** if you find errors or improvements

## Runbook Template

Each runbook follows this structure:

```markdown
# [Incident Type] Runbook

## Symptoms
- How you know this incident is occurring

## Quick Diagnosis
- Fast checks to confirm the issue

## Resolution Steps
1. Step-by-step instructions
2. Commands to run
3. What to expect

## Verification
- How to verify the issue is resolved

## Prevention
- How to prevent this from happening again

## Related
- Links to related documentation
```

## When to Create a New Runbook

Create a runbook after:
- Any P0 or P1 incident that took >1 hour to resolve
- Any incident that happens 2+ times
- Any complex procedure that requires tribal knowledge
- Any procedure that multiple people need to execute

## Runbook Best Practices

1. **Keep it simple** - Step by step, no assumptions
2. **Include commands** - Copy-paste ready
3. **Include expected output** - So you know if it worked
4. **Test regularly** - At least quarterly
5. **Update immediately** - After using in real incident
6. **Version control** - Track changes to runbooks
