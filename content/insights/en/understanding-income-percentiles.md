---
title: "What Does It Actually Mean to Be in the Top 10%?"
description: "A quick primer on income percentiles — how they're calculated, why your county and the nation give different answers, and what the number actually tells you."
date: "2026-08-06"
---

## What is an income percentile?

When this site says you're in the "top 15%," it means an estimated 15% of the
comparison group — everyone in your county, or the whole country — reports a
higher income than you, based on US Census Bureau survey data. It's a
**ranking**, not a grade: it says nothing about cost of living, taxes, or
whether your income covers your expenses.

## Why your county and the nation give different numbers

The same income can land you in a very different percentile depending on the
comparison group:

- A **$120,000** salary might be roughly the median in a high-cost county, but
  comfortably top-10% nationwide.
- A county with a small population has a noisier estimate than a state or the
  nation — the Census Bureau's American Community Survey (ACS) samples a
  fraction of households, so smaller geographies carry more statistical
  uncertainty.

Neither number is "more correct" — they're answering different questions
("where do I stand locally?" vs. "where do I stand nationally?").

## How the calculation actually works

There's no secret model here. The Census publishes household counts in fixed
income brackets (table B19001), and those brackets become anchor points. At
the national level, for example, 40.5% of households report $100,000 or
more, and 23.0% report $150,000 or more.

If your income is $120,000, you fall between two anchors, so the site
interpolates between them — on a log scale, because income distributions are
closer to log-normal than linear. The same anchor table exists for every
state and every county, which is how a local percentile is possible at all.

Two consequences follow from this, and both are worth knowing:

- **The middle of the distribution is measured well.** The brackets are
  dense between $10,000 and $200,000, so a percentile anywhere in that range
  is anchored to real published counts, not extrapolation.
- **The very top isn't.** The highest bracket is "$200,000 or more" —
  open-ended. Anything above it is extended from the curve rather than
  measured, which is why this site won't quote a precise top-1% dollar
  figure. [The full explanation is
  here](/us/insights/top-1-percent-income-threshold).

## What a percentile deliberately ignores

A percentile ranks income against income. That's all it does. It has no idea
about:

- **Cost of living.** Ranking in the top 20% nationally can still mean an
  ordinary standard of living in an expensive metro. [Why a high income
  doesn't always mean you're
  ahead](/us/insights/cost-of-living-vs-income) works through a case where
  the same income is top-15% nationally and roughly median locally.
- **Taxes.** Every figure here is pre-tax household income, and state tax
  rules differ enough to matter.
- **Household size.** A $95,000 single-person household and a $95,000
  household of four get the identical percentile. See [household income vs.
  individual income](/us/insights/household-vs-individual-income) for why
  this is the most common misreading of all.
- **Your age.** A typical under-25 household earns $45,332, against $97,843
  for the 45–64 bracket — so a low national ranking in your twenties is the
  expected result, not a warning sign. The [earnings
  curve](/us/insights/income-by-age-curve) explains the shape.

## Where the numbers come from

This site doesn't estimate or guess. Every percentile is interpolated from
published anchor points in the US Census Bureau's ACS 5-Year Estimates
(tables B19013 and B19001), the same tables you could pull yourself from
[data.census.gov](https://data.census.gov). Net worth percentiles come from
the Federal Reserve's Survey of Consumer Finances, and 401(k) figures from
Vanguard's *How America Saves* report — see the [About page](/us/about) for
the full source list.

## Takeaway

A single percentile number is a useful snapshot, not the whole picture.
Compare yourself at more than one scope — your county, your state, your age
band — before drawing conclusions.

Used well, though, it's genuinely clarifying. Most people carry around a
vague sense of whether they're doing well, assembled from their neighbours,
their colleagues, and whatever numbers happen to be in the news. A
percentile replaces that with something specific and checkable, drawn from
the same public tables anyone can audit.

Curious where you actually land? Enter your household income and see your
percentile nationally, in your state, and in your own county. The
calculation runs entirely in your browser — what you type is never sent to
or stored on our servers. [Check where you stand](/us).
