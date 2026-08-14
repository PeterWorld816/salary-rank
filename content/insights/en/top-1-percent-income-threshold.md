---
title: "What Income Puts You in the Top 1%?"
description: "The honest answer to the top 1%, 5%, and 10% question — what the Census data can pin down, what it can't, and why the threshold changes completely depending on your state."
date: "2026-08-13"
---

## The question the data can only half-answer

"What income puts you in the top 1%?" is one of the most-searched income
questions there is, and most of the answers you'll find quote a confident
dollar figure to the nearest thousand.

This site won't, and the reason is worth understanding before you trust any
number you see elsewhere.

Every percentile here is built from the Census Bureau's American Community
Survey (ACS) 2020–2024 5-Year Estimates — specifically table B19001, which
sorts households into income brackets. Those brackets are the anchor points
the whole calculator interpolates between. And the highest bracket B19001
publishes is **"$200,000 or more."** It's open-ended. There is no $300,000
bracket, no $500,000 bracket, no ceiling at all.

## What the anchors actually say

Here's what the national data supports directly, with no modeling on top:

| Household income | Share of US households at or above it |
|---|---|
| $200,000 | **13.4%** |
| $150,000 | 23.0% |
| $125,000 | 30.4% |
| $100,000 | 40.5% |
| $75,000 | 53.1% |

Read the top row carefully, because it does most of the work in this
article. About 13.4% of US households report $200,000 or more. That single
fact tells you something useful and something frustrating at the same time.

The useful part: **the top 10% line sits somewhere just above $200,000.** If
13.4% of households clear $200,000, then the cutoff for the top 10% has to
be a bit higher than that — not dramatically higher, since the brackets are
still fairly dense at that point, but higher.

The frustrating part: the top 5% line and the top 1% line are both buried
*inside* that open-ended bracket. The ACS tells us how many households are
above $200,000. It does not tell us how they're distributed once they're up
there — whether a household is at $210,000 or $2.1 million, B19001 files
them in the same box.

## Why the top of the distribution is so hard to measure

You can extend a curve past its last known point mathematically. This site's
percentile engine does exactly that, because a calculator has to return
*something* when someone types in $400,000. But the further past $200,000
you go, the more the answer depends on the shape you assumed rather than on
anything the Census actually counted.

There are three compounding problems at the very top:

- **The bracket is open-ended.** Any figure past $200,000 is extrapolation,
  not measurement.
- **Very high earners are rare in a household survey.** The ACS samples a
  fraction of households. The top 1% is, by definition, one in a hundred —
  so even a large sample contains relatively few of them, and estimates get
  noisy fast.
- **The income mix changes at the top.** Households in the top 1% draw far
  more of their income from capital gains, business ownership, and other
  non-wage sources than the typical household does. Those are exactly the
  categories a survey questionnaire captures least reliably.

None of this makes the ACS a bad dataset. It's the best broad-coverage
income data the US publishes, and it's excellent for the range where almost
everyone actually lives. It's just the wrong instrument for pinning down the
extreme tail, and the tools that quote a crisp top-1% number are usually
leaning on tax-return data — a different source with different rules about
what counts as income.

So the honest answer to "what puts you in the top 1%?" is: substantially
more than $200,000 in household income, and this dataset can't responsibly
narrow it further.

## The threshold isn't national — it's local

Here's the part that gets left out of most articles on this topic. There
isn't one top-1% line. There are effectively fifty-one of them, and the
spread is enormous.

Take the same $200,000 household and move it around the country. The share
of local households earning at least that much:

| State | Share of households at $200,000+ |
|---|---|
| Mississippi | 5.8% |
| West Virginia | 5.9% |
| Arkansas | 6.7% |
| **United States** | **13.4%** |
| California | 20.5% |
| New Jersey | 21.6% |
| Massachusetts | 22.3% |
| District of Columbia | 26.7% |

A $200,000 household is roughly top-6% in Mississippi and merely top-27% in
D.C. — the same paycheck, a gap of more than twenty percentage points. In
D.C., more than one household in four clears $200,000.

That's not a rounding difference. It means "top 1% income" is a
fundamentally different number in Jackson than in Arlington, and any single
national figure papers over that. Our [ranking of all 50 states by median
household income](/us/insights/state-median-income-rankings) shows the same
pattern at the middle of the distribution, where the highest and lowest
states differ by nearly $53,000.

## One more thing: this is household income

Every figure above is *household* income — everyone in the home, combined,
from every source. Not one person's salary.

This trips people up constantly in the top-percentile conversation. Two
professionals each earning $105,000 are a $210,000 household, and they land
in the same B19001 bracket as a single earner making $210,000 alone. The
statistics treat them identically; their lives probably don't feel
identical. If you're trying to work out where your own paycheck sits rather
than your household's, read [household income vs. individual
income](/us/insights/household-vs-individual-income) before drawing
conclusions.

## The takeaway

Chasing a precise top-1% dollar figure is mostly chasing a number the
underlying data can't support. What you *can* do — and what's far more
useful anyway — is see exactly where your income lands against real,
published brackets, nationally and in the place you actually live.

Enter your income to see your percentile nationally, in your state, and in
your county: [check where you stand](/us).
