# Points Scaling Solutions

## Problem
As players accumulate points over years, numbers become very large (e.g., 1892 points) which looks unrealistic compared to new players (e.g., 12 points).

## Solutions (Ranked by Recommendation)

### 1. **Season-Based Points (RECOMMENDED) ⭐**
Reset points at the start of each season/year. This is the most common approach in sports.

**Pros:**
- Keeps numbers manageable and realistic
- Creates fresh competition each season
- Most familiar to users (like real sports leagues)
- Easy to implement

**Cons:**
- Need to track seasons
- Historical data needs separate storage

**Implementation:**
- Add `season` or `year` field to matches table
- Filter leaderboards by current season
- Show "All-Time" as separate view

---

### 2. **Points Per Match (Primary Display)**
Make "Points Per Match" the primary metric instead of total points.

**Pros:**
- No need to reset data
- Fair comparison regardless of experience
- Already calculating this value
- Shows efficiency, not just volume

**Cons:**
- Less intuitive for some users
- Small sample size can skew results

**Implementation:**
- Display "Points Per Match" prominently
- Show total points as secondary info
- Sort leaderboards by PPM

---

### 3. **Recent Form (Last N Matches)**
Show points from last 10-20 matches instead of all-time.

**Pros:**
- Reflects current performance
- Keeps numbers reasonable
- Rewards recent good form
- No data loss

**Cons:**
- Doesn't reward consistency
- Can fluctuate quickly

**Implementation:**
- Add time window filter (Last 10 matches, Last 30 days, etc.)
- Default to recent matches
- Option to view all-time

---

### 4. **Normalized Scoring (Decay System)**
Older matches contribute less to total points.

**Pros:**
- Keeps all data relevant
- Rewards recent performance more
- Smooth transition

**Cons:**
- Complex calculation
- Less transparent to users
- Harder to explain

**Implementation:**
- Apply decay factor: `points = points * (0.95 ^ months_ago)`
- Recent matches = 100%, 1 year ago = ~54%, 2 years = ~29%

---

### 5. **Display Formatting**
Format large numbers better (e.g., "1.9K" instead of "1892").

**Pros:**
- Simple to implement
- No data changes needed
- Better UX

**Cons:**
- Doesn't solve the core problem
- Still shows huge differences

**Implementation:**
- Format: `points >= 1000 ? (points/1000).toFixed(1) + 'K' : points`
- Example: 1892 → "1.9K", 12 → "12"

---

### 6. **Tiered/League System**
Separate players into leagues/tiers based on total points.

**Pros:**
- Creates competitive tiers
- Fair matchups
- Clear progression

**Cons:**
- Complex to manage
- May split community
- Requires more features

---

## Recommended Approach: **Hybrid Solution**

Combine **Season-Based Points** (primary) + **All-Time Stats** (secondary):

1. **Default View**: Current season points (reset annually)
2. **Secondary View**: All-time points (for historical records)
3. **Display**: Format large numbers (1.9K format)
4. **Sorting**: Primary by season points, secondary by PPM

### Implementation Plan:

1. Add `season` field to matches table (default: current year)
2. Update leaderboards API to filter by season
3. Add season selector in UI
4. Show both "Season Points" and "All-Time Points"
5. Format large numbers for readability

---

## What Others Do:

- **Fantasy Football (ESPN, Yahoo)**: Season-based reset
- **FIFA Ultimate Team**: Season-based with all-time records
- **Rocket League**: Season-based rankings
- **Overwatch**: Seasonal competitive points
- **Premier League**: Season-based tables with all-time records

**Most common pattern**: Season-based primary, all-time secondary.
