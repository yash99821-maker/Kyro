/**
 * ============================================================
 * KYRO DEMO SEED SCRIPT
 * ============================================================
 *
 * Wipes the KYRO collections and inserts a realistic demo dataset so every
 * screen has something to show during a project demonstration:
 *
 *   - a primary demo user (Harish Sharma) plus four friends
 *   - ~8 weeks of categorised transactions, so Kyro AI has enough history
 *     to compare this week vs last week and this month vs last month
 *   - Kyro Save round-up entries derived from those transactions
 *   - two groups with expenses, an equal split, a custom split and a
 *     settlement
 *   - notifications and money requests
 *
 * EVERYTHING CREATED HERE IS DEMO DATA. No real person, account or payment
 * is involved.
 *
 * Run with:  npm run seed
 */

import mongoose from 'mongoose'
import { connectDatabase, describeConnection, disconnectDatabase } from '../config/database.js'
import { DEFAULT_DEMO_PIN } from '../config/constants.js'
import {
  Expense,
  Group,
  MoneyRequest,
  Notification,
  OtpToken,
  Saving,
  Settlement,
  Transaction,
  User,
  type IUser,
} from '../models/index.js'
import { calculateRoundUp } from '../services/savingsService.js'
import { generateReferenceId } from '../utils/reference.js'
import { roundMoney } from '../utils/money.js'
import { splitEqually } from '../services/groupService.js'

const DEMO_BALANCE = 25450

/** Builds a date `daysAgo` days back at a fixed time of day. */
function daysAgo(days: number, hour = 12, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

interface SeedTx {
  days: number
  hour: number
  amount: number
  category: string
  type: 'PAYMENT' | 'RECEIVED' | 'RECHARGE' | 'BILL'
  who: string
  upi?: string
  description: string
  status?: 'SUCCESS' | 'FAILED'
  meta?: Record<string, unknown>
}

/**
 * Hand-tuned history. Food is deliberately higher this week than last week
 * so the Kyro AI "food spending increased" rule fires during a demo, and
 * travel is deliberately lower so a positive insight fires too.
 */
const SEED_TRANSACTIONS: SeedTx[] = [
  // ---- this week (higher food, lower travel) ----
  { days: 0, hour: 13, amount: 427, category: 'food', type: 'PAYMENT', who: 'Cafe Mocha', upi: 'cafemocha@kyro', description: 'Lunch with friends' },
  { days: 0, hour: 10, amount: 126, category: 'food', type: 'PAYMENT', who: 'Rahul Sharma', upi: 'rahul.sharma3210@kyro', description: 'Breakfast split' },
  { days: 1, hour: 20, amount: 643, category: 'food', type: 'PAYMENT', who: 'Spice Garden', upi: 'spicegarden@kyro', description: 'Dinner' },
  { days: 1, hour: 11, amount: 87, category: 'travel', type: 'PAYMENT', who: 'City Metro', upi: 'citymetro@kyro', description: 'Metro top-up' },
  { days: 2, hour: 18, amount: 1899, category: 'shopping', type: 'PAYMENT', who: 'TrendWear', upi: 'trendwear@kyro', description: 'Winter jacket' },
  { days: 2, hour: 9, amount: 239, category: 'recharge', type: 'RECHARGE', who: 'Airtel · 9999999999', description: 'Mobile recharge for 9999999999', meta: { operator: 'Airtel', simulated: true } },
  { days: 3, hour: 15, amount: 2000, category: 'transfer', type: 'RECEIVED', who: 'Priya Sharma', upi: 'priya.sharma3211@kyro', description: 'Rent share' },
  { days: 3, hour: 12, amount: 317, category: 'food', type: 'PAYMENT', who: 'Daily Groceries', upi: 'dailygrocer@kyro', description: 'Groceries' },
  { days: 4, hour: 19, amount: 499, category: 'entertainment', type: 'PAYMENT', who: 'StreamBox', upi: 'streambox@kyro', description: 'Monthly subscription' },
  { days: 4, hour: 8, amount: 64, category: 'travel', type: 'PAYMENT', who: 'City Metro', upi: 'citymetro@kyro', description: 'Metro fare' },

  // ---- last week (lower food, higher travel) ----
  { days: 8, hour: 13, amount: 264, category: 'food', type: 'PAYMENT', who: 'Cafe Mocha', upi: 'cafemocha@kyro', description: 'Coffee and sandwich' },
  { days: 8, hour: 17, amount: 1253, category: 'travel', type: 'PAYMENT', who: 'GoCabs', upi: 'gocabs@kyro', description: 'Airport cab' },
  { days: 9, hour: 21, amount: 382, category: 'food', type: 'PAYMENT', who: 'Spice Garden', upi: 'spicegarden@kyro', description: 'Takeaway' },
  { days: 9, hour: 10, amount: 896, category: 'travel', type: 'PAYMENT', who: 'RailConnect', upi: 'railconnect@kyro', description: 'Train ticket' },
  { days: 10, hour: 16, amount: 1454, category: 'bills', type: 'BILL', who: 'State Electricity Board', description: 'electricity bill · 4402917733', meta: { billType: 'electricity', simulated: true } },
  { days: 11, hour: 14, amount: 723, category: 'shopping', type: 'PAYMENT', who: 'BookNook', upi: 'booknook@kyro', description: 'Study books' },
  { days: 12, hour: 12, amount: 152, category: 'food', type: 'PAYMENT', who: 'Campus Canteen', upi: 'canteen@kyro', description: 'Lunch' },
  { days: 13, hour: 11, amount: 648, category: 'healthcare', type: 'PAYMENT', who: 'CarePlus Pharmacy', upi: 'careplus@kyro', description: 'Medicines' },

  // ---- earlier this month ----
  { days: 16, hour: 18, amount: 2406, category: 'shopping', type: 'PAYMENT', who: 'ElectroMart', upi: 'electromart@kyro', description: 'Headphones' },
  { days: 17, hour: 9, amount: 799, category: 'bills', type: 'BILL', who: 'AquaCity Water Works', description: 'water bill · WTR88213', meta: { billType: 'water', simulated: true } },
  { days: 18, hour: 20, amount: 546, category: 'food', type: 'PAYMENT', who: 'Spice Garden', upi: 'spicegarden@kyro', description: 'Family dinner' },
  { days: 19, hour: 15, amount: 5000, category: 'transfer', type: 'RECEIVED', who: 'Amit Kumar', upi: 'amit.kumar3212@kyro', description: 'Loan returned' },
  { days: 20, hour: 13, amount: 342, category: 'travel', type: 'PAYMENT', who: 'GoCabs', upi: 'gocabs@kyro', description: 'Cab to college' },
  { days: 22, hour: 19, amount: 1108, category: 'entertainment', type: 'PAYMENT', who: 'PVR Cineplex', upi: 'pvrcine@kyro', description: 'Movie night' },
  { days: 24, hour: 10, amount: 463, category: 'food', type: 'PAYMENT', who: 'Daily Groceries', upi: 'dailygrocer@kyro', description: 'Weekly groceries' },

  // ---- last month (gives the month-on-month comparison something to use) ----
  { days: 34, hour: 12, amount: 1687, category: 'food', type: 'PAYMENT', who: 'Spice Garden', upi: 'spicegarden@kyro', description: 'Birthday dinner' },
  { days: 36, hour: 16, amount: 3204, category: 'shopping', type: 'PAYMENT', who: 'TrendWear', upi: 'trendwear@kyro', description: 'Festive shopping' },
  { days: 38, hour: 9, amount: 1526, category: 'bills', type: 'BILL', who: 'State Electricity Board', description: 'electricity bill · 4402917733', meta: { billType: 'electricity', simulated: true } },
  { days: 40, hour: 18, amount: 2103, category: 'travel', type: 'PAYMENT', who: 'RailConnect', upi: 'railconnect@kyro', description: 'Weekend trip tickets' },
  { days: 42, hour: 14, amount: 299, category: 'recharge', type: 'RECHARGE', who: 'Airtel · 9999999999', description: 'Mobile recharge for 9999999999', meta: { operator: 'Airtel', simulated: true } },
  { days: 44, hour: 11, amount: 987, category: 'healthcare', type: 'PAYMENT', who: 'CarePlus Pharmacy', upi: 'careplus@kyro', description: 'Health checkup' },
  { days: 46, hour: 20, amount: 758, category: 'entertainment', type: 'PAYMENT', who: 'PVR Cineplex', upi: 'pvrcine@kyro', description: 'Movie with friends' },
  { days: 48, hour: 13, amount: 1254, category: 'food', type: 'PAYMENT', who: 'Cafe Mocha', upi: 'cafemocha@kyro', description: 'Team lunch' },

  // a failed payment, so the history filters have something to filter
  { days: 5, hour: 17, amount: 1500, category: 'shopping', type: 'PAYMENT', who: 'ElectroMart', upi: 'electromart@kyro', description: 'Payment declined', status: 'FAILED' },
]

/**
 * Everyday spending going back six months.
 *
 * The hand-written list above drives the week-on-week Kyro AI rules. This
 * generator fills in the longer tail so the 6-month chart is not mostly
 * empty and the Kyro Save pot reflects a realistic amount of round-up
 * history rather than a hardcoded number.
 *
 * A tiny seeded PRNG keeps the dataset identical on every run, so a demo
 * looks the same each time it is reset.
 */
function makeSeededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const ROUTINE_SPENDS: Array<{ who: string; upi: string; category: string; description: string; min: number; max: number }> = [
  { who: 'Campus Canteen', upi: 'canteen@kyro', category: 'food', description: 'Canteen lunch', min: 45, max: 190 },
  { who: 'Cafe Mocha', upi: 'cafemocha@kyro', category: 'food', description: 'Coffee run', min: 95, max: 340 },
  { who: 'Daily Groceries', upi: 'dailygrocer@kyro', category: 'food', description: 'Groceries', min: 180, max: 720 },
  { who: 'City Metro', upi: 'citymetro@kyro', category: 'travel', description: 'Metro fare', min: 25, max: 110 },
  { who: 'GoCabs', upi: 'gocabs@kyro', category: 'travel', description: 'Cab ride', min: 120, max: 480 },
  { who: 'BookNook', upi: 'booknook@kyro', category: 'shopping', description: 'Books and stationery', min: 150, max: 900 },
  { who: 'TrendWear', upi: 'trendwear@kyro', category: 'shopping', description: 'Clothing', min: 450, max: 2200 },
  { who: 'StreamBox', upi: 'streambox@kyro', category: 'entertainment', description: 'Subscription', min: 149, max: 649 },
  { who: 'PVR Cineplex', upi: 'pvrcine@kyro', category: 'entertainment', description: 'Movie tickets', min: 220, max: 780 },
  { who: 'CarePlus Pharmacy', upi: 'careplus@kyro', category: 'healthcare', description: 'Pharmacy', min: 110, max: 640 },
]

/** Builds ~4 routine payments per week for the last `days` days. */
function generateRoutineHistory(fromDay: number, toDay: number): SeedTx[] {
  const random = makeSeededRandom(20260909)
  const generated: SeedTx[] = []

  for (let day = fromDay; day <= toDay; day += 1) {
    // Roughly four routine payments a week.
    const paymentsToday = random() < 0.55 ? 1 : random() < 0.25 ? 2 : 0
    for (let i = 0; i < paymentsToday; i += 1) {
      const spend = ROUTINE_SPENDS[Math.floor(random() * ROUTINE_SPENDS.length)]!
      // Non-round amounts, so Kyro Save round-ups actually accumulate.
      const amount = Math.round(spend.min + random() * (spend.max - spend.min))
      generated.push({
        days: day,
        hour: 8 + Math.floor(random() * 13),
        amount,
        category: spend.category,
        type: 'PAYMENT',
        who: spend.who,
        upi: spend.upi,
        description: spend.description,
      })
    }
  }

  return generated
}

/** Recent weeks come from the curated list; days 25-180 are generated. */
const ALL_SEED_TRANSACTIONS: SeedTx[] = [
  ...SEED_TRANSACTIONS,
  ...generateRoutineHistory(25, 180).filter((tx) => tx.days > 24),
]

interface FriendSpec {
  name: string
  mobileNumber: string
  balance: number
}

const FRIENDS: FriendSpec[] = [
  { name: 'Rahul Sharma', mobileNumber: '9876543210', balance: 12300 },
  { name: 'Priya Sharma', mobileNumber: '9876543211', balance: 18750 },
  { name: 'Amit Kumar', mobileNumber: '9876543212', balance: 9400 },
  { name: 'Sneha Patil', mobileNumber: '9876543213', balance: 15600 },
]

/** Merchants that appear in the seeded history, so their QR codes resolve. */
const MERCHANTS = [
  'Cafe Mocha|cafemocha@kyro',
  'Spice Garden|spicegarden@kyro',
  'Daily Groceries|dailygrocer@kyro',
  'TrendWear|trendwear@kyro',
  'City Metro|citymetro@kyro',
  'GoCabs|gocabs@kyro',
  'RailConnect|railconnect@kyro',
  'StreamBox|streambox@kyro',
  'BookNook|booknook@kyro',
  'CarePlus Pharmacy|careplus@kyro',
  'ElectroMart|electromart@kyro',
  'PVR Cineplex|pvrcine@kyro',
  'Campus Canteen|canteen@kyro',
]

async function createUser(
  name: string,
  mobileNumber: string,
  upiId: string,
  balance: number,
  extra: Partial<IUser> = {},
): Promise<IUser> {
  const user = new User({
    name,
    mobileNumber,
    upiId,
    balance,
    savingsBalance: 0,
    isDemo: true,
    kyroSave: { enabled: true, roundUpTo: 10, goalName: 'Laptop Goal', goalAmount: 60000 },
    ...extra,
  })
  await user.setTransactionPin(DEFAULT_DEMO_PIN)
  await user.save()
  return user
}

async function seed() {
  const connection = await connectDatabase()
  console.log(`\n  Seeding KYRO demo data into ${describeConnection(connection)}\n`)

  // --- 1. clear existing data ------------------------------------------
  await Promise.all([
    User.deleteMany({}),
    Transaction.deleteMany({}),
    Saving.deleteMany({}),
    Group.deleteMany({}),
    Expense.deleteMany({}),
    Settlement.deleteMany({}),
    Notification.deleteMany({}),
    MoneyRequest.deleteMany({}),
    OtpToken.deleteMany({}),
  ])
  console.log('  ✓ cleared existing collections')

  // --- 2. users ---------------------------------------------------------
  const demoUser = await createUser('Harish Sharma', '9999999999', 'harish.sharma9999@kyro', DEMO_BALANCE, {
    email: 'harish.sharma@example.com',
  })

  const friends: IUser[] = []
  for (const friend of FRIENDS) {
    const upiId = `${friend.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}${friend.mobileNumber.slice(-4)}@kyro`
    friends.push(await createUser(friend.name, friend.mobileNumber, upiId, friend.balance))
  }

  // Merchants are ordinary accounts so Scan & Pay can resolve their QR codes.
  let merchantSeq = 8800000000
  for (const entry of MERCHANTS) {
    const [name, upiId] = entry.split('|') as [string, string]
    merchantSeq += 1
    await createUser(name, String(merchantSeq), upiId, 0)
  }
  console.log(`  ✓ created ${1 + friends.length + MERCHANTS.length} demo accounts`)

  // --- 3. transactions + matching Kyro Save round-ups -------------------
  let savingsTotal = 0
  let savedCount = 0

  for (const seedTx of ALL_SEED_TRANSACTIONS) {
    const when = daysAgo(seedTx.days, seedTx.hour, (seedTx.days * 7) % 60)
    const status = seedTx.status ?? 'SUCCESS'
    const isInflow = seedTx.type === 'RECEIVED'

    const transaction = await Transaction.create({
      userId: demoUser._id,
      type: seedTx.type,
      amount: seedTx.amount,
      category: seedTx.category,
      sender: isInflow
        ? { name: seedTx.who, upiId: seedTx.upi ?? '' }
        : { name: demoUser.name, upiId: demoUser.upiId, userId: demoUser._id },
      receiver: isInflow
        ? { name: demoUser.name, upiId: demoUser.upiId, userId: demoUser._id }
        : { name: seedTx.who, upiId: seedTx.upi ?? '' },
      status,
      description: seedTx.description,
      referenceId: generateReferenceId(isInflow ? 'KYRORCV' : 'KYROTXN'),
      roundUpAmount: 0,
      meta: seedTx.meta ?? {},
      createdAt: when,
      updatedAt: when,
    })

    // Round-ups only apply to successful outgoing payments.
    if (status === 'SUCCESS' && !isInflow) {
      const { roundedAmount, savedAmount, originalAmount } = calculateRoundUp(seedTx.amount, 10)
      if (savedAmount > 0) {
        await Saving.create({
          userId: demoUser._id,
          transactionId: transaction._id,
          originalAmount,
          roundedAmount,
          savedAmount,
          roundUpType: 10,
          label: seedTx.description,
          createdAt: when,
          updatedAt: when,
        })
        transaction.roundUpAmount = savedAmount
        await transaction.save()
        savingsTotal = roundMoney(savingsTotal + savedAmount)
        savedCount += 1
      }
    }
  }

  demoUser.savingsBalance = savingsTotal
  await demoUser.save()
  console.log(
    `  ✓ created ${ALL_SEED_TRANSACTIONS.length} transactions and ${savedCount} Kyro Save round-ups (₹${savingsTotal})`,
  )

  // --- 4. groups --------------------------------------------------------
  const tripGroup = await Group.create({
    name: 'Weekend Trip',
    description: 'Goa trip expenses',
    emoji: '🏖️',
    createdBy: demoUser._id,
    members: [
      { userId: demoUser._id, name: demoUser.name, mobileNumber: demoUser.mobileNumber },
      { userId: friends[0]!._id, name: friends[0]!.name, mobileNumber: friends[0]!.mobileNumber },
      { userId: friends[2]!._id, name: friends[2]!.name, mobileNumber: friends[2]!.mobileNumber },
      { userId: friends[3]!._id, name: friends[3]!.name, mobileNumber: friends[3]!.mobileNumber },
    ],
  })

  const tripMembers = tripGroup.members.map((m) => m._id)
  const [me, rahul, amit, sneha] = tripMembers as [
    mongoose.Types.ObjectId,
    mongoose.Types.ObjectId,
    mongoose.Types.ObjectId,
    mongoose.Types.ObjectId,
  ]

  // Equal split: hotel paid by the demo user, split four ways.
  const hotelShares = splitEqually(4000, 4)
  await Expense.create({
    groupId: tripGroup._id,
    description: 'Hotel booking',
    amount: 4000,
    paidBy: me,
    splitType: 'EQUAL',
    participants: tripMembers.map((id, i) => ({ memberId: id, share: hotelShares[i]! })),
    createdBy: demoUser._id,
    createdAt: daysAgo(6, 14),
  })

  // Equal split paid by someone else, so the demo user owes money too.
  const cabShares = splitEqually(2400, 4)
  await Expense.create({
    groupId: tripGroup._id,
    description: 'Airport cabs',
    amount: 2400,
    paidBy: rahul,
    splitType: 'EQUAL',
    participants: tripMembers.map((id, i) => ({ memberId: id, share: cabShares[i]! })),
    createdBy: demoUser._id,
    createdAt: daysAgo(6, 9),
  })

  // Custom split: an uneven dinner bill.
  await Expense.create({
    groupId: tripGroup._id,
    description: 'Beach dinner',
    amount: 1000,
    paidBy: sneha,
    splitType: 'CUSTOM',
    participants: [
      { memberId: me, share: 200 },
      { memberId: rahul, share: 300 },
      { memberId: amit, share: 200 },
      { memberId: sneha, share: 300 },
    ],
    createdBy: demoUser._id,
    createdAt: daysAgo(5, 21),
  })

  // A partial settlement, so the settlement history is not empty.
  await Settlement.create({
    groupId: tripGroup._id,
    fromMemberId: amit,
    toMemberId: me,
    amount: 500,
    status: 'COMPLETED',
    note: 'Part payment for the hotel',
    recordedBy: demoUser._id,
    settledAt: daysAgo(3, 11),
    createdAt: daysAgo(3, 11),
  })

  const collegeGroup = await Group.create({
    name: 'College Friends',
    description: 'Canteen and project expenses',
    emoji: '🎓',
    createdBy: demoUser._id,
    members: [
      { userId: demoUser._id, name: demoUser.name, mobileNumber: demoUser.mobileNumber },
      { userId: friends[1]!._id, name: friends[1]!.name, mobileNumber: friends[1]!.mobileNumber },
      { userId: friends[2]!._id, name: friends[2]!.name, mobileNumber: friends[2]!.mobileNumber },
      { name: 'Vikram Rao', mobileNumber: '' },
      { name: 'Neha Joshi', mobileNumber: '' },
    ],
  })

  const collegeMembers = collegeGroup.members.map((m) => m._id)
  const printShares = splitEqually(1500, collegeMembers.length)
  await Expense.create({
    groupId: collegeGroup._id,
    description: 'Project printing and binding',
    amount: 1500,
    paidBy: collegeMembers[0]!,
    splitType: 'EQUAL',
    participants: collegeMembers.map((id, i) => ({ memberId: id, share: printShares[i]! })),
    createdBy: demoUser._id,
    createdAt: daysAgo(9, 16),
  })

  const canteenShares = splitEqually(900, 3)
  await Expense.create({
    groupId: collegeGroup._id,
    description: 'Canteen treat',
    amount: 900,
    paidBy: collegeMembers[1]!,
    splitType: 'EQUAL',
    participants: [collegeMembers[0]!, collegeMembers[1]!, collegeMembers[2]!].map((id, i) => ({
      memberId: id,
      share: canteenShares[i]!,
    })),
    createdBy: demoUser._id,
    createdAt: daysAgo(2, 13),
  })

  console.log('  ✓ created 2 groups with expenses and a settlement')

  // --- 5. money requests -------------------------------------------------
  await MoneyRequest.create([
    {
      requesterId: demoUser._id,
      payeeName: friends[0]!.name,
      payeeUpiId: friends[0]!.upiId,
      payeeUserId: friends[0]!._id,
      amount: 750,
      note: 'Your share of the hotel',
      status: 'PENDING',
      createdAt: daysAgo(2, 10),
    },
    {
      requesterId: demoUser._id,
      payeeName: friends[3]!.name,
      payeeUpiId: friends[3]!.upiId,
      payeeUserId: friends[3]!._id,
      amount: 300,
      note: 'Movie tickets',
      status: 'ACCEPTED',
      createdAt: daysAgo(7, 19),
    },
  ])

  // --- 6. notifications ---------------------------------------------------
  await Notification.create([
    {
      userId: demoUser._id,
      type: 'SYSTEM',
      title: 'Welcome to KYRO',
      message: 'Your demo account is ready. Every payment now rounds up into Kyro Save.',
      link: '/save',
      createdAt: daysAgo(30, 9),
      read: true,
    },
    {
      userId: demoUser._id,
      type: 'SAVING',
      title: 'Kyro Save is growing',
      message: `You have saved ₹${savingsTotal} through automatic round-ups so far.`,
      link: '/save',
      createdAt: daysAgo(1, 9),
    },
    {
      userId: demoUser._id,
      type: 'GROUP',
      title: 'Weekend Trip',
      message: 'Rahul Sharma added "Airport cabs" — ₹2,400 split 4 ways.',
      link: '/groups',
      createdAt: daysAgo(6, 9),
    },
    {
      userId: demoUser._id,
      type: 'INSIGHT',
      title: 'Kyro AI',
      message: 'Your food spending is higher than last week. Open Kyro AI for the breakdown.',
      link: '/insights',
      createdAt: daysAgo(0, 8),
    },
  ])
  console.log('  ✓ created notifications and money requests')

  // --- summary -----------------------------------------------------------
  console.log('\n  ================= DEMO CREDENTIALS =================')
  console.log('   Mobile number    : 9999999999')
  console.log('   OTP              : 123456')
  console.log('   Transaction PIN  : 1234')
  console.log(`   Opening balance  : ₹${DEMO_BALANCE.toLocaleString('en-IN')}`)
  console.log(`   Kyro Save total  : ₹${savingsTotal.toLocaleString('en-IN')}`)
  console.log('  ===================================================')
  console.log('\n  All of the above is DEMO DATA. No real money is involved.\n')

  await disconnectDatabase()
}

seed().catch(async (error) => {
  console.error('\n  Seeding failed:', error)
  await mongoose.connection.close().catch(() => undefined)
  process.exit(1)
})
