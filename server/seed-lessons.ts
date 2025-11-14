
import { db } from "./db";
import { lessons, quizQuestions } from "@shared/schema";

const lessonsData = [
  {
    title: "Mastering Needs vs Wants",
    slug: "needs-vs-wants",
    category: "budgeting",
    orderIndex: 1,
    estimatedMinutes: 15,
    objectives: [
      "Understand the difference between needs and wants",
      "Learn to classify your expenses accurately",
      "Use the app to track and adjust spending patterns",
      "Build intentional spending habits"
    ],
    content: `# Lesson: Mastering Needs vs Wants – The Foundation of Financial Success

## 1. Introduction: Why Needs vs Wants?

Have you ever reached the end of the month and wondered where all your money went? You're not alone. Most people aren't derailed by one big unnecessary purchase, but rather by a series of small spending choices. Most of these are "wants" disguised as "needs"—and recognizing them is the first step toward taking control.

On your finance journey, every decision to spend is a choice: Is this sustaining you—keeping you healthy, safe, able to work and learn? Or is it about comfort, luxury, or simply habit? The *goal* isn't to remove wants entirely, but to become intentional about when—and how—you indulge, so your needs, priorities, and dreams get funded first.

## 2. Defining Needs and Wants – Real Life, Real Money

### Needs: The Essentials
A need is something you require to survive, stay healthy, or fulfill basic social and work obligations. Common examples include:
- **Food and clean water** – Groceries, basic meals, tap water (but not designer coffee or fancy restaurants)
- **Shelter and utilities** – Rent or mortgage, electricity, heating/cooling, water bill
- **Basic transportation** – Bus fare, gas for commuting to work/school (but not luxury vehicles or ride-shares for fun)
- **Essential clothing** – Enough to stay warm and presentable
- **Healthcare** – Medicines, insurance, doctor's visits
- **Minimum communications** – A basic phone plan, internet (for work/school)

### Wants: The Extras
A want is something that makes life more enjoyable, convenient, or entertaining—but isn't strictly necessary to live or fulfill your duties. Examples:
- **Dining out and takeout** – Even if it feels convenient
- **Premium/Designer brands**
- **Streaming services or TV add-ons**
- **Frequent upgrades (phones, clothes, gadgets)**
- **Travel for leisure**
- **Hobbies and entertainment** – The latest video game, movies, concerts

> It's easy to convince yourself that a daily coffee, gym membership, or premium cable are needs. But pause and ask: "If I lost my job today, would I keep paying for this to survive?"

## 3. The Psychology: Why We Misclassify Wants as Needs

Advertisers, social norms, peer pressure, and even stress can blur the line. Marketing works hard to convince you their product is essential ("You *need* this newest phone to keep up!"), and it's common to justify wants as needs, especially when tired or emotional.

- **Emotional spending:** Buying as a reward after a hard week ("I deserve it!")
- **Social pressure:** Wanting to keep up with friends' spending habits
- **Habit drift:** Turning rare treats into regular routines (Friday takeout turns into daily delivery)

Honest reflection—and sometimes a reality check—helps break this cycle.

## 4. Step-by-Step: Classifying Your Own Spending

**Step 1:** For each expense you log in PersonalFinance Pro, ask: "If I had to cut my budget 30% tomorrow, would I still keep this?"
- If yes, it's a need. If you could live without it, it's a want.

**Step 2:** Use your app's feature to tag expenses as "Need" or "Want" when creating transactions.

**Step 3:** At the end of the week, view your dashboard breakdown. Look at the ratio of need vs want spending.

**Step 4:** Commit: For next week, aim to shift just 10% of your want spending toward saving or a financial goal.

## 5. Goal-Setting: Using Wants to Fund Your Dreams

Cutting all wants is neither realistic nor desirable. Instead, *use wants as a lever* for saving and goal achievement:
- Pick one recurring want to pause for a week (e.g., no takeout coffee).
- Redirect the saved sum to your emergency fund or a goal.
- Track your progress and reward yourself when you see results!

## 6. Key Takeaways

- **Needs** keep you safe, fed, and functional. **Wants** add comfort and fun.
- Mastering this distinction frees up money for goals, reduces financial stress, and builds lasting wealth habits.
- Use your app to make invisible spending visible—and celebrate every smart choice you make!

## 7. Next Steps

Move on to "Building Your First Budget" to turn these insights into a practical, goal-driven plan. Use your app's dashboard and tracking tools every day to reinforce your new habits.

*Remember: You don't have to be perfect—just intentional. Make your money choices reflect what matters most to you.*`
  },
  {
    title: "Building Your First Budget",
    slug: "building-first-budget",
    category: "budgeting",
    orderIndex: 2,
    estimatedMinutes: 20,
    objectives: [
      "Learn the 50/30/20 budgeting rule",
      "Create your first budget using the app",
      "Understand zero-based budgeting",
      "Track budget vs actual spending"
    ],
    content: `# Lesson: Building Your First Budget – Taking Control of Your Money

## 1. Why Budget?

A budget isn't about restriction—it's about intention. It's a plan that ensures your money goes where you want it to go, not where it accidentally flows. Without a budget, you're flying blind, hoping there's enough at month's end. With one, you're the pilot.

## 2. The 50/30/20 Rule

The simplest, most effective budgeting framework:
- **50% to Needs** – Essential living expenses (housing, food, transport, utilities, healthcare)
- **30% to Wants** – Lifestyle and enjoyment (dining out, entertainment, hobbies)
- **20% to Savings** – Emergency fund, debt repayment, investments, goals

This rule gives you balance: cover essentials, enjoy life, and build your future.

## 3. Using the Budget Wizard

PersonalFinance Pro's Budget Wizard walks you through creating your first budget:

**Step 1: Enter Your Income**
- List all monthly income sources (salary, side hustles, etc.)
- The app calculates your total available

**Step 2: Categorize Expenses**
- Review your recent transactions
- Assign each to "Needs" or "Wants"
- The app suggests common categories

**Step 3: Allocate Amounts**
- Set spending limits per category
- See visual pie chart of your allocation
- Get alerts if you stray from 50/30/20

**Step 4: Review & Confirm**
- Check your budget summary
- Adjust if needed
- Save and start tracking!

## 4. Zero-Based Budgeting

An alternative approach: every dollar gets assigned a job. Your income minus all allocations should equal zero. Nothing is "leftover"—everything has purpose.

## 5. Tracking Progress

Use the app's budget dashboard to:
- See spending vs budget in real-time
- Get alerts when approaching limits
- Review monthly to adjust for next period

## 6. Key Takeaways

- Budgets give you control and clarity
- Start with 50/30/20, adjust to fit your life
- Use the app's wizard—it makes budgeting simple
- Review and adjust monthly

## 7. Next Steps

Practice using the Budget Wizard this week. Track your actual spending and compare to your plan. Adjust as you learn what works for you.`
  },
  {
    title: "Starting an Emergency Fund",
    slug: "emergency-fund",
    category: "saving",
    orderIndex: 3,
    estimatedMinutes: 18,
    objectives: [
      "Understand why emergency funds are critical",
      "Calculate your target fund amount",
      "Learn where to keep emergency savings",
      "Build your fund systematically"
    ],
    content: `# Lesson: Starting an Emergency Fund – Your Safety Net for Life's Surprises

## 1. What Is an Emergency Fund?

An emergency fund is dedicated savings set aside for unexpected expenses: medical emergencies, job loss, car breakdowns, or urgent home repairs. It's your financial shield against panic, debt, and regret.

## 2. How Much Do You Need?

The standard recommendation: **3-6 months of essential expenses**

Calculate yours:
- Add up monthly costs for rent, groceries, transport, utilities, insurance, healthcare
- Multiply by 3 (minimum) or 6 (ideal)
- Example: $1,000/month essentials = $3,000-$6,000 target

The app's Emergency Fund Goal template does this calculation for you.

## 3. Where to Keep It

Not all accounts are equal for emergencies:
- **High-yield savings account** – Easy access, earns interest
- **Separate from spending account** – Reduces temptation
- **NOT in investments** – Too risky and slow to access

## 4. Building Your Fund

**Start Small:**
- Even $10-20 per week adds up
- Use the app to automate transfers

**Accelerate Growth:**
- Direct tax refunds and bonuses to your fund
- Cut one "want" category temporarily
- Sell unused items

**Track Progress:**
- Use the app's goal tracker
- Celebrate milestones (10%, 25%, 50%, 100%)
- Adjust target as your expenses change

## 5. Real-Life Story: Angela's Emergency Win

Angela lost her job suddenly. Because she had built a $3,000 emergency fund, she paid three months of rent, utilities, and food while job hunting—no loans, no selling belongings. She rebuilt her fund within a year.

You can be like Angela—build your buffer now.

## 6. Key Takeaways

- Emergency funds prevent crisis from becoming catastrophe
- Start with 3 months of essentials, build to 6
- Keep it accessible but separate
- Use the app to automate and track

## 7. Next Steps

Set up your Emergency Fund goal in the app today. Start with whatever you can afford—consistency matters more than amount.`
  },
  {
    title: "Understanding Credit",
    slug: "understanding-credit",
    category: "credit",
    orderIndex: 4,
    estimatedMinutes: 25,
    objectives: [
      "Learn what credit is and how it works",
      "Understand credit scores and reports",
      "Know the risks and benefits of borrowing",
      "Use credit responsibly for growth"
    ],
    content: `# Lesson: Understanding Credit – A Blueprint for Responsible Borrowing

## 1. What Is Credit?

Credit is accessing money, goods, or services now by agreeing to repay later—often with interest. It's a tool that can help you grow or trap you in debt.

## 2. Types of Credit

**Loans:**
- Personal, student, auto, mortgage
- Fixed repayment schedule
- Can be secured (collateral) or unsecured

**Credit Cards:**
- Revolving credit line
- Flexible repayment (but watch interest!)
- Build credit history quickly

**Store Credit:**
- Retail accounts and financing
- Often higher interest rates
- Convenient but risky

## 3. How Credit Scores Work

Your credit score (typically 300-850) measures trustworthiness:

**Factors:**
- Payment history (35%) – Most important!
- Credit utilization (30%) – Keep below 30% of limits
- Length of credit history (15%)
- Types of credit (10%)
- New credit inquiries (10%)

**Why It Matters:**
- Better scores = lower interest rates
- Easier loan approvals
- More negotiating power

## 4. Responsible Credit Use

**Good Credit Habits:**
- Pay on time, every time
- Keep balances low
- Don't open too many accounts quickly
- Monitor your credit report annually

**Avoid These Traps:**
- Paying only minimums
- Maxing out cards
- Using credit for wants instead of needs
- Ignoring terms and fees

## 5. Using the App to Manage Credit

Track all credit accounts in PersonalFinance Pro:
- Log balances and limits
- Set payment reminders
- Monitor utilization percentage
- Simulate debt payoff scenarios

## 6. When to Use Credit

**Good Uses:**
- Education that increases earning potential
- Home ownership (builds equity)
- Business investment
- True emergencies (when emergency fund depleted)

**Bad Uses:**
- Shopping sprees
- Lifestyle upgrades you can't afford
- Paying old debt with new debt
- Routine expenses when income is sufficient

## 7. Key Takeaways

- Credit is a powerful tool—use it wisely
- Your credit score affects your financial future
- Pay on time, keep balances low, read all terms
- Use the app to stay organized and never miss payments

## 8. Next Steps

Log all your credit accounts in the app. Set up payment reminders. Request your free annual credit report to check for errors.`
  },
  {
    title: "Setting SMART Financial Goals",
    slug: "smart-goals",
    category: "saving",
    orderIndex: 5,
    estimatedMinutes: 22,
    objectives: [
      "Learn the SMART goal framework",
      "Create achievable financial goals",
      "Break big goals into manageable steps",
      "Track and celebrate progress"
    ],
    content: `# Lesson: Setting SMART Financial Goals – Turning Intention Into Achievement

## 1. Why Goal Setting Works

Studies show people who write down specific goals are 10x more likely to achieve them. Your app makes goals visual, trackable, and motivating.

## 2. The SMART Framework

A SMART goal is:
- **Specific:** "Save $500 for a laptop" not "Save more"
- **Measurable:** Track progress with numbers
- **Achievable:** Realistic given your budget
- **Relevant:** Meaningful to your life
- **Time-bound:** "By July 1" not "someday"

## 3. Types of Financial Goals

**Short-term (< 1 year):**
- Emergency fund
- Pay off credit card
- Save for device or course

**Medium-term (1-3 years):**
- Car down payment
- Wedding fund
- Professional certification

**Long-term (3+ years):**
- Home ownership
- Retirement
- Children's education

## 4. Using the Goal Wizard

**Step 1:** Create New Goal
- Choose template or custom
- Name it specifically
- Set target amount

**Step 2:** Set Timeline
- Choose realistic deadline
- Break into monthly/weekly targets
- Link to budget categories

**Step 3:** Track Progress
- Log deposits toward goal
- See progress bar grow
- Get milestone notifications

**Step 4:** Adjust as Needed
- Life changes—goals can too
- Stay flexible but focused

## 5. Real-Life Story: Lillian's Micro-Bakery

Lillian wanted to start a bakery but couldn't save enough. Using the app:
- Set SMART goal: "Save $4,000 by September for supplies"
- Broke into $500/month
- Cut dining out, sold unused items
- Tracked every deposit
- Met goal 2 weeks early!

She launched her business and set new expansion goals.

## 6. Managing Multiple Goals

- Prioritize by urgency and importance
- Focus on 1-2 at a time
- Review quarterly
- Celebrate each completed goal

## 7. Key Takeaways

- SMART goals turn dreams into reality
- Specificity and deadlines drive success
- Small consistent steps compound
- The app makes tracking effortless

## 8. Next Steps

Create 3 goals in the app: one short, medium, and long-term. Write why each matters to you. Set your first milestone deadline.`
  },
  {
    title: "Tracking and Reviewing Progress",
    slug: "tracking-progress",
    category: "budgeting",
    orderIndex: 6,
    estimatedMinutes: 15,
    objectives: [
      "Establish regular review habits",
      "Use dashboard analytics effectively",
      "Adjust plans based on data",
      "Stay motivated with milestones"
    ],
    content: `# Lesson: Tracking and Reviewing Progress – Sustaining Financial Growth

## 1. Why Review Matters

What gets measured gets improved. Regular check-ins keep you on track, spot problems early, and maintain motivation.

## 2. Weekly Check-In (5 minutes)

Use the app's dashboard:
- Review recent transactions
- Check budget vs actual
- Note any overspending
- Plan adjustments for next week

## 3. Monthly Review (30 minutes)

Deeper analysis:
- Compare all budget categories
- Review goal progress
- Calculate savings rate
- Identify spending patterns
- Adjust next month's budget

## 4. Quarterly Assessment (1 hour)

Big picture view:
- Review financial health score
- Check net worth trend
- Evaluate goal timelines
- Celebrate wins
- Reset priorities if needed

## 5. Using App Analytics

The dashboard shows:
- Spending by category (pie charts)
- Income vs expenses (bar charts)
- Net worth over time (line graphs)
- Budget adherence (progress bars)

Click any metric for detailed breakdowns.

## 6. Staying Motivated

- Set milestone rewards (non-spending!)
- Share progress with accountability partner
- Join app community challenges
- Visualize what achieving goals means
- Remember your "why"

## 7. When to Adjust

Change your plan when:
- Income changes significantly
- Major life event occurs
- Goals no longer relevant
- Consistently over/under budget in category

## 8. Key Takeaways

- Regular reviews keep you accountable
- Use app dashboards for quick insights
- Adjust plans as life changes
- Celebrate progress to stay motivated

## 9. Next Steps

Schedule weekly 5-minute check-ins. Set a monthly review reminder. Review your dashboard right now—what's one insight you can act on this week?`
  },
  {
    title: "Understanding Double-Entry Bookkeeping: The Foundation of Personal Finance Pro",
    slug: "understanding-double-entry",
    category: "budgeting",
    orderIndex: 7,
    estimatedMinutes: 35,
    objectives: [
      "Understand what double-entry bookkeeping is and why it matters",
      "Learn how every transaction affects two accounts",
      "Master the four account types: Assets, Liabilities, Income, and Expenses",
      "Discover how the app uses this system to give you complete financial clarity",
      "Learn to use Quick Deals and Full Transactions effectively"
    ],
    content: `# Lesson: Understanding Double-Entry Bookkeeping – The Secret Behind Your Financial Clarity

## Introduction: Why This App is Different

You may have noticed that Personal Finance Pro asks for more information when you record a transaction than other apps. When you log a $50 grocery purchase, the app wants to know both where the money came from (your Checking Account) and where it went (Food & Dining expense). This isn't busy work—it's the foundation of **professional accounting** working for you.

This lesson will help you understand **why** the app works this way, and **how** to use it to gain complete control over your money.

---

## Part 1: What is Double-Entry Bookkeeping?

### The Core Principle

In double-entry bookkeeping, every financial transaction affects **at least two accounts**. Money doesn't just disappear or appear—it always moves from somewhere to somewhere else.

**Example:** When you buy groceries for $50:
- Your cash decreases by $50 (one account affected)
- Your food expenses increase by $50 (second account affected)

This creates a complete picture: not just "I spent $50" but "I spent $50 from my checking account on groceries."

### Why This Matters to You

Traditional expense trackers only record one side: "Spent $50 on groceries." But this leaves questions:
- Did you pay with cash, credit card, or checking account?
- Is your account balance accurate?
- Can you calculate your true net worth?

Double-entry bookkeeping answers all these questions automatically because it tracks both sides of every transaction.

---

## Part 2: The Four Account Types

Personal Finance Pro organizes all your money into four types of accounts. Understanding these is key to mastering the app.

### 1. ASSETS (Things You Own)

Assets are resources you control that have value. They represent money you have or things that can be converted to money.

**Examples in the app:**
- Cash (physical money)
- Checking Account (your bank account)
- Savings Account (your emergency fund)
- Investment Account (stocks, bonds)

**Key Rule:** When assets increase, that's a **debit**. When they decrease, that's a **credit**.

**Real-life example:**
- You receive your $2,000 paycheck → Checking Account increases (debit)
- You withdraw $100 cash → Checking Account decreases (credit)

### 2. LIABILITIES (Things You Owe)

Liabilities are debts or obligations you must repay.

**Examples in the app:**
- Credit Card (money owed to credit card company)
- Student Loan (money borrowed for education)
- Car Loan (auto financing)
- Mortgage (home loan)

**Key Rule:** When liabilities increase, that's a **credit**. When they decrease, that's a **debit**.

**Real-life example:**
- You charge $100 to your credit card → Credit Card liability increases (credit)
- You pay $100 toward your credit card → Credit Card liability decreases (debit)

### 3. INCOME (Money Coming In)

Income accounts track all the ways you earn money.

**Examples in the app:**
- Salary Income (your job)
- Business Income (side hustle)
- Investment Income (dividends, interest)
- Other Income (gifts, refunds)

**Key Rule:** Income increases with a **credit** (yes, this seems backward, but it's how accounting works!).

**Real-life example:**
- You earn $2,000 salary → Salary Income increases (credit)
- You earn $50 from a side gig → Business Income increases (credit)

### 4. EXPENSES (Money Going Out)

Expense accounts track all the ways you spend money.

**Examples in the app:**
- Food & Dining (groceries, restaurants)
- Transportation (gas, bus fare, car maintenance)
- Entertainment (movies, games, hobbies)
- Housing (rent, utilities)
- Healthcare (doctor visits, medications)

**Key Rule:** Expenses increase with a **debit**.

**Real-life example:**
- You buy $50 in groceries → Food & Dining expense increases (debit)
- You pay $100 for utilities → Housing expense increases (debit)

---

## Part 3: How Transactions Work in the App

Let's walk through real examples to see how double-entry creates a complete financial picture.

### Example 1: Getting Paid

**Scenario:** Your employer deposits $2,000 into your checking account.

**What happens:**
1. **DEBIT** Checking Account (asset) +$2,000 → Your money increases
2. **CREDIT** Salary Income (income) +$2,000 → You record earning income

**Why both entries matter:**
- The debit shows you now have more money available
- The credit shows you earned this money (not a loan or gift)
- Your net worth increased by $2,000

### Example 2: Buying Groceries with Debit Card

**Scenario:** You spend $120 on groceries, paying with your debit card.

**What happens:**
1. **DEBIT** Food & Dining (expense) +$120 → You record the expense
2. **CREDIT** Checking Account (asset) -$120 → Your account balance decreases

**Why both entries matter:**
- The debit shows what you spent money on
- The credit shows where the money came from
- Your checking account balance is automatically updated

### Example 3: Using a Credit Card

**Scenario:** You buy $80 in gas using your credit card.

**What happens:**
1. **DEBIT** Transportation (expense) +$80 → You record the expense
2. **CREDIT** Credit Card (liability) +$80 → Your debt increases

**Why both entries matter:**
- The debit tracks your transportation spending
- The credit shows you now owe $80 more
- Your net worth decreased by $80 (spent money you don't have yet)

### Example 4: Paying Off Your Credit Card

**Scenario:** You pay $200 toward your credit card from your checking account.

**What happens:**
1. **DEBIT** Credit Card (liability) -$200 → Your debt decreases
2. **CREDIT** Checking Account (asset) -$200 → Your cash decreases

**Why both entries matter:**
- The debit shows you reduced your debt
- The credit shows where the payment came from
- Your net worth stays the same (you converted cash to debt reduction—both are yours)

---

## Part 4: Using the App – Two Ways to Record Transactions

Personal Finance Pro gives you two ways to record transactions, depending on how much detail you want:

### Method 1: Quick Deals (Simplified for Daily Use)

**Best for:** Regular daily expenses and income

**What it does:** Automatically handles the double-entry behind the scenes.

**How to use it:**
1. Click "Quick Deal" on the dashboard
2. Select "Income" or "Expense"
3. Enter amount and description (e.g., "$50 groceries")
4. Pick the account it affects (e.g., Checking Account)
5. Submit

**What the app does automatically:**
- Creates or finds the appropriate expense/income category
- Makes both the debit and credit entries
- Updates your account balances
- Maintains proper accounting

**Example:** Log "$50 groceries" → App creates Food & Dining expense and reduces your Checking Account.

### Method 2: Record a Transaction (Full Control)

**Best for:** Complex transactions or when you want to see exactly what's happening

**What it does:** Shows you both sides of the transaction so you understand the full picture.

**How to use it:**
1. Click "Record a Transaction"
2. Enter date, amount, and description
3. **Debit Entry:** Choose the account that increases (usually an expense or asset)
4. **Credit Entry:** Choose the account that decreases (usually an asset or creates a liability)
5. Add notes if needed
6. Submit

**When to use this:**
- Transferring money between your own accounts
- Split payments (part cash, part credit)
- Recording investments
- Any time you want to learn by seeing both sides

---

## Part 5: Your Financial Picture – What This System Reveals

Because the app tracks every transaction using double-entry, it can automatically calculate powerful insights:

### 1. Net Worth (What You're Actually Worth)

**Formula:** Assets - Liabilities = Net Worth

The app shows you:
- Total value of everything you own (cash, savings, investments)
- Minus total debt (credit cards, loans)
- Equals your true financial position

**Example:**
- Assets: $8,000 (Checking) + $5,000 (Savings) = $13,000
- Liabilities: $2,000 (Credit Card)
- **Net Worth: $11,000**

### 2. Cash Flow (Money In vs Money Out)

The app compares:
- All income (salary, side hustles, etc.)
- All expenses (food, rent, entertainment, etc.)
- Shows if you're living within your means

### 3. Account Balances (Always Accurate)

Because every transaction touches two accounts:
- Your checking account balance is always current
- Credit card balances update automatically
- No manual reconciliation needed

### 4. Spending by Category

The app can show:
- How much you spend on food vs entertainment
- Trends over time
- Budget vs actual comparison
- Opportunities to save

---

## Part 6: Common Scenarios Explained

Let's tackle some situations that confuse people:

### "I transferred $500 from Checking to Savings—is that an expense?"

**No!** This is an asset-to-asset transfer.

**Transaction:**
1. **DEBIT** Savings Account (asset) +$500
2. **CREDIT** Checking Account (asset) -$500

**Result:** Your net worth doesn't change—you just moved money between your own accounts.

### "I got a $50 refund from a store—how do I record that?"

**Option 1:** If you already logged the original expense, reverse it:
1. **DEBIT** Checking Account (asset) +$50
2. **CREDIT** The original expense category -$50

**Option 2:** Treat it as "Other Income"
1. **DEBIT** Checking Account (asset) +$50
2. **CREDIT** Other Income +$50

### "I borrowed $1,000 from my friend—is that income?"

**No!** Borrowed money is a liability, not income.

**Transaction:**
1. **DEBIT** Cash or Checking Account (asset) +$1,000
2. **CREDIT** Personal Loan (liability) +$1,000

**Result:** Your net worth doesn't change—you have more cash but equal debt.

---

## Part 7: Practical Tips for Success

### Start with Quick Deals

Don't overwhelm yourself. Use Quick Deals for 90% of your transactions:
- Log groceries, gas, coffee, rent
- Let the app handle the accounting
- Build the habit of recording everything

### Use Full Transactions When Learning

When you want to understand what's happening:
- Record one transaction manually
- See both the debit and credit sides
- Notice how your balances update
- Repeat until it clicks

### Check Your Dashboard Weekly

The app's power comes from the data it collects:
- Review spending by category
- Check if you're on budget
- See your net worth trend
- Adjust as needed

### Trust the System

If your accounts don't seem to balance:
- Check recent transactions for errors
- Verify you didn't skip recording something
- The double-entry system catches mistakes automatically

---

## Part 8: Why This Matters for Your Future

Understanding double-entry bookkeeping through this app gives you:

### 1. **Financial Literacy**
You're learning principles used by businesses and accountants worldwide. These skills translate to any financial situation.

### 2. **Complete Visibility**
Unlike simple expense trackers, you see:
- Where every dollar came from
- Where every dollar went
- Your true financial position

### 3. **Better Decision Making**
When you understand that charging your credit card increases debt (not just spending), you make different choices.

### 4. **Preparation for Growth**
As your finances get complex (investments, multiple income sources, business):
- The app scales with you
- The foundation is already solid
- You're ready for advanced strategies

---

## Conclusion: Your Next Steps

**This week:**
1. Record 5 transactions using "Quick Deals"
2. Record 1 transaction using "Record a Transaction" to see both sides
3. Check your dashboard and review your net worth
4. Notice how your account balances update automatically

**This month:**
5. Set up all your accounts (checking, savings, credit cards)
6. Review the Transactions page to see the debit/credit pattern
7. Use the Budget wizard to allocate your income
8. Track your spending categories

**Going forward:**
9. Make recording transactions a daily habit
10. Use the app's insights to make better money decisions
11. Celebrate as your net worth grows and debt shrinks
12. Share what you've learned with friends who struggle with money

---

## Key Takeaways

✅ **Double-entry bookkeeping** means every transaction affects two accounts
✅ **Four account types:** Assets (own), Liabilities (owe), Income (earn), Expenses (spend)
✅ **Quick Deals** simplify daily use while maintaining proper accounting
✅ **Full Transactions** teach you to see both sides of every financial move
✅ **The system automatically** calculates net worth, cash flow, and account balances
✅ **You're not just tracking expenses**—you're building a complete financial picture

---

## Quiz Yourself

Before moving on, test your understanding:

1. If you pay $100 rent with your debit card, which accounts are affected?
2. Is getting paid a salary an increase in assets or income (or both)?
3. When you pay off a credit card, does your net worth increase?
4. What's the difference between transferring money between accounts and spending money?

**Answers:**
1. Debit: Housing Expense (+$100), Credit: Checking Account (-$100)
2. Both! Asset increases (more cash), Income increases (you earned it)
3. No—you're converting one asset (cash) into less liability (debt reduction)
4. Transfers move money between your accounts (no net worth change). Spending moves money from your account to expenses (net worth decreases).

---

*Congratulations! You now understand the professional accounting system powering Personal Finance Pro. This knowledge puts you ahead of 95% of people managing money. Use it wisely, and watch your financial confidence grow!*`
  }
];

const quizzesData = [
  // Needs vs Wants Quiz
  {
    lessonSlug: "needs-vs-wants",
    questions: [
      {
        question: "Which of these is a WANT, not a need?",
        options: ["Basic groceries", "Doctor's visit for illness", "New designer headphones", "Rent payment"],
        correctAnswer: "2",
        explanation: "Designer headphones are a want because basic communication can be achieved with cheaper alternatives. The other options are essential needs."
      },
      {
        question: "You're behind on rent. Which expenses should you cut FIRST?",
        options: ["Healthcare insurance", "Streaming services and entertainment", "Grocery budget", "Transportation to work"],
        correctAnswer: "1",
        explanation: "Entertainment and streaming services are wants that should be cut first when facing financial crisis. Needs like rent, healthcare, food, and work transport must be prioritized."
      },
      {
        question: "What happens if you consistently overspend on wants every month?",
        options: ["Nothing—wants are important too", "You build wealth faster", "You can't save for goals or emergencies", "Your needs automatically get funded"],
        correctAnswer: "2",
        explanation: "Overspending on wants prevents saving for emergencies and goals, leaving you financially vulnerable and unable to build wealth."
      },
      {
        question: "How does the app help you identify wants crowding out needs?",
        options: ["It deletes want purchases automatically", "It shows spending breakdowns by category", "It prevents want purchases", "It hides want transactions"],
        correctAnswer: "1",
        explanation: "The app provides visual breakdowns showing how much you spend on needs vs wants, helping you see where adjustments are needed."
      }
    ]
  },
  // Budget Quiz
  {
    lessonSlug: "building-first-budget",
    questions: [
      {
        question: "In the 50/30/20 rule, what percentage goes to savings and debt repayment?",
        options: ["50%", "30%", "20%", "10%"],
        correctAnswer: "2",
        explanation: "The 50/30/20 rule allocates 20% to savings, debt repayment, and financial goals."
      },
      {
        question: "What's the main benefit of zero-based budgeting?",
        options: ["You never save any money", "Every dollar has a purpose", "You spend everything", "You don't track expenses"],
        correctAnswer: "1",
        explanation: "Zero-based budgeting ensures every dollar of income is assigned to a specific purpose—spending, saving, or debt—leaving no money unaccounted for."
      },
      {
        question: "How often should you review and adjust your budget?",
        options: ["Never—set it once and forget", "Every 5 years", "Monthly", "Only when you get a raise"],
        correctAnswer: "2",
        explanation: "Monthly reviews allow you to track actual vs budgeted spending, identify patterns, and make necessary adjustments."
      },
      {
        question: "Which expense belongs in the 'Needs' category (50%)?",
        options: ["Concert tickets", "Netflix subscription", "Rent and utilities", "Restaurant meals"],
        correctAnswer: "2",
        explanation: "Rent and utilities are essential needs for shelter and basic living, while the others are wants."
      }
    ]
  },
  // Emergency Fund Quiz
  {
    lessonSlug: "emergency-fund",
    questions: [
      {
        question: "What is the recommended minimum emergency fund amount?",
        options: ["1 month of expenses", "3-6 months of expenses", "1 year of expenses", "$100"],
        correctAnswer: "1",
        explanation: "Financial experts recommend saving 3-6 months of essential living expenses to cover most emergency situations."
      },
      {
        question: "Where should you keep your emergency fund?",
        options: ["In stocks and bonds", "Under your mattress", "In a high-yield savings account", "In your checking account"],
        correctAnswer: "2",
        explanation: "A high-yield savings account provides easy access when needed while earning some interest, without the risks of investments."
      },
      {
        question: "Which is NOT a valid emergency?",
        options: ["Job loss", "Medical emergency", "Car breakdown preventing work", "Black Friday sale on new TV"],
        correctAnswer: "3",
        explanation: "Sales and shopping opportunities are not emergencies. True emergencies threaten your health, housing, or ability to earn income."
      },
      {
        question: "How can you grow your emergency fund faster?",
        options: ["Only save when you feel like it", "Direct all bonuses and tax refunds to it", "Use it for regular expenses", "Never add to it"],
        correctAnswer: "1",
        explanation: "Directing windfalls like bonuses, tax refunds, and raises to your emergency fund accelerates growth significantly."
      }
    ]
  },
  // Credit Quiz
  {
    lessonSlug: "understanding-credit",
    questions: [
      {
        question: "True or False: All debt is bad and should be avoided completely.",
        options: ["True", "False"],
        correctAnswer: "1",
        explanation: "False. Strategic debt for education, home ownership, or business can build wealth. The key is using credit responsibly for growth, not consumption."
      },
      {
        question: "What percentage of your credit score is based on payment history?",
        options: ["10%", "35%", "50%", "70%"],
        correctAnswer: "1",
        explanation: "Payment history accounts for 35% of your credit score—the single largest factor. Always pay on time!"
      },
      {
        question: "What should you do if you're denied a loan due to poor credit?",
        options: ["Give up on borrowing", "Apply for more loans immediately", "Check your credit report for errors and work on improving your score", "Use payday loans instead"],
        correctAnswer: "2",
        explanation: "Review your credit report for errors, address any issues, pay bills on time, and work on improving your score before reapplying."
      },
      {
        question: "What's the recommended credit utilization ratio?",
        options: ["100% - max out all cards", "Under 30% of credit limits", "50% exactly", "It doesn't matter"],
        correctAnswer: "1",
        explanation: "Keeping credit card balances below 30% of your limits shows responsible usage and helps maintain a good credit score."
      }
    ]
  },
  // Goals Quiz
  {
    lessonSlug: "smart-goals",
    questions: [
      {
        question: "What does the 'M' in SMART goals stand for?",
        options: ["Massive", "Measurable", "Monthly", "Mandatory"],
        correctAnswer: "1",
        explanation: "Measurable means you can track progress with specific numbers or criteria."
      },
      {
        question: "Why is setting a deadline essential for goals?",
        options: ["It's not—deadlines add pressure", "It creates urgency and commitment", "Goals without deadlines work better", "Deadlines don't matter"],
        correctAnswer: "1",
        explanation: "Deadlines create urgency, help you plan backward, and turn 'someday' into 'by this date,' making goals more likely to succeed."
      },
      {
        question: "How can breaking big goals into small steps help you achieve them?",
        options: ["It can't—small steps waste time", "Makes progress visible and manageable", "It makes goals take longer", "Only big steps matter"],
        correctAnswer: "1",
        explanation: "Small steps make progress visible, build momentum, and prevent overwhelm—key factors in achieving big goals."
      },
      {
        question: "What should you do if you fall behind on a goal?",
        options: ["Give up completely", "Adjust the timeline or amount to stay realistic", "Ignore it and hope it works out", "Start over from zero"],
        correctAnswer: "1",
        explanation: "Life happens. Adjust your goal to remain achievable rather than abandoning it. Flexibility within structure leads to success."
      }
    ]
  },
  // Tracking Quiz
  {
    lessonSlug: "tracking-progress",
    questions: [
      {
        question: "How often should you do a quick financial check-in?",
        options: ["Once a year", "Monthly only", "Weekly", "Never—set and forget"],
        correctAnswer: "2",
        explanation: "Weekly 5-minute check-ins help you catch issues early, stay aware of spending, and maintain good habits."
      },
      {
        question: "What's the main purpose of monthly budget reviews?",
        options: ["To feel guilty about spending", "To compare actual vs planned and adjust", "To never spend on wants again", "To impress others"],
        correctAnswer: "1",
        explanation: "Monthly reviews let you see what worked, what didn't, and make informed adjustments for the next month."
      },
      {
        question: "When should you adjust your financial plan?",
        options: ["Never—plans are set in stone", "Only if you get rich", "When income, expenses, or priorities change significantly", "Every day"],
        correctAnswer: "2",
        explanation: "Life changes require plan adjustments. Job changes, family events, or shifted priorities all warrant updating your financial plan."
      },
      {
        question: "How do app dashboards help with tracking?",
        options: ["They don't—tracking is manual work", "They visualize spending patterns and trends", "They hide your spending", "They only show errors"],
        correctAnswer: "1",
        explanation: "Dashboards transform raw data into visual insights—charts, graphs, and trends that make patterns obvious and actionable."
      }
    ]
  },
  // Double-Entry Quiz
  {
    lessonSlug: "understanding-double-entry",
    questions: [
      {
        question: "What is the fundamental principle of double-entry bookkeeping?",
        options: ["Record every expense twice", "Every transaction affects at least two accounts", "Always use two credit cards", "Keep two separate budgets"],
        correctAnswer: "1",
        explanation: "Double-entry bookkeeping means every transaction affects at least two accounts—showing both where money came from and where it went."
      },
      {
        question: "Which account type increases with a DEBIT entry?",
        options: ["Income accounts", "Liability accounts", "Asset and Expense accounts", "Only savings accounts"],
        correctAnswer: "2",
        explanation: "Assets and Expenses increase with debit entries. This is the fundamental rule of double-entry accounting."
      },
      {
        question: "You buy $50 in groceries with your debit card. What are the two entries?",
        options: ["Debit Food Expense $50, Credit Checking Account $50", "Credit Food Expense $50, Debit Checking Account $50", "Debit Checking Account $50, Credit Food Expense $50", "Two debits to Checking Account"],
        correctAnswer: "0",
        explanation: "You debit (increase) Food Expense and credit (decrease) Checking Account. The expense goes up, your cash goes down."
      },
      {
        question: "If you transfer $100 from Checking to Savings, does your net worth change?",
        options: ["Yes, it increases by $100", "Yes, it decreases by $100", "No, you're just moving money between your own accounts", "It depends on interest rates"],
        correctAnswer: "2",
        explanation: "Transferring between your own accounts doesn't change net worth—you're moving assets from one place to another, but your total wealth stays the same."
      },
      {
        question: "What's the difference between Quick Deals and Record a Transaction?",
        options: ["Quick Deals are faster but less accurate", "Quick Deals handle double-entry automatically, Record a Transaction shows you both sides", "Record a Transaction is only for businesses", "There is no difference"],
        correctAnswer: "1",
        explanation: "Quick Deals simplify the process by handling the double-entry behind the scenes. Record a Transaction lets you see and control both the debit and credit entries."
      },
      {
        question: "When you charge $80 on your credit card for gas, what happens to your net worth?",
        options: ["It increases by $80", "It stays the same", "It decreases by $80", "It depends on the interest rate"],
        correctAnswer: "2",
        explanation: "Your net worth decreases by $80 because you increased expenses (debit) and increased your debt/liability (credit). You spent money you don't have yet."
      },
      {
        question: "Which formula correctly calculates Net Worth?",
        options: ["Income - Expenses", "Assets + Liabilities", "Assets - Liabilities", "Income + Assets"],
        correctAnswer: "2",
        explanation: "Net Worth = Assets - Liabilities. It's what you own minus what you owe, giving your true financial position."
      },
      {
        question: "Is borrowed money from a friend considered income?",
        options: ["Yes, it increases your cash", "No, it's a liability", "Yes, if you don't plan to repay it", "Only if it's over $1,000"],
        correctAnswer: "1",
        explanation: "Borrowed money is a liability, not income. You have more cash (asset increases) but equal debt (liability increases), so your net worth doesn't change."
      }
    ]
  }
];

export async function seedLessons() {
  try {
    console.log("Starting lesson seed...");

    // Insert lessons
    for (const lessonData of lessonsData) {
      // Check if lesson already exists
      const existing = await db.query.lessons.findFirst({
        where: (lessons, { eq }) => eq(lessons.slug, lessonData.slug)
      });

      let lesson;
      if (existing) {
        console.log(`Lesson already exists: ${lessonData.title}`);
        lesson = existing;
      } else {
        [lesson] = await db.insert(lessons).values(lessonData).returning();
        console.log(`Created lesson: ${lesson.title}`);
      }

      // Find quiz data for this lesson
      const quizData = quizzesData.find(q => q.lessonSlug === lessonData.slug);
      
      if (quizData) {
        // Check if questions already exist
        const existingQuestions = await db.query.quizQuestions.findMany({
          where: (quizQuestions, { eq }) => eq(quizQuestions.lessonId, lesson.id)
        });

        if (existingQuestions.length === 0) {
          // Insert quiz questions
          for (let i = 0; i < quizData.questions.length; i++) {
            const q = quizData.questions[i];
            await db.insert(quizQuestions).values({
              lessonId: lesson.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              orderIndex: i
            });
          }
          console.log(`  Added ${quizData.questions.length} quiz questions`);
        } else {
          console.log(`  Quiz questions already exist for ${lessonData.title}`);
        }
      }
    }

    console.log("Lesson seed completed successfully!");
  } catch (error) {
    console.error("Error seeding lessons:", error);
    throw error;
  }
}
