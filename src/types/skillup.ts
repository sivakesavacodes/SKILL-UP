export const GST = 0.18;
export const LOW_SEATS_LIMIT = 10;
export const MAX_ITEMS_PER_REGISTRATION = 20;
export const MAX_REGISTRATIONS = 250;
export const STUDENT_DISCOUNT_RATE = 0.2;
export const PROFESSIONAL_DISCOUNT_RATE = 0.0;

export enum ParticipantType {
  Student = 'S',
  Professional = 'P',
}

export enum ActiveView {
  Catalog = 'catalog',
  Register = 'register',
  Bills = 'bills',
  Report = 'report',
}

export interface Workshop {
  id: number;
  name: string;
  category: 'Technical' | 'Soft Skill' | 'Career';
  fee: number;
  initialSeats: number;
  availableSeats: number;
  seatsBooked: number;
}

export interface OrderLine {
  lineId: string;
  workshopId: number;
  workshopName: string;
  fee: number;
  quantity: number;
}

export interface Registration {
  registrationId: string;
  tokenNumber: number;
  hall: 'A' | 'B';
  participantName: string;
  participantType: ParticipantType;
  discountRate: number;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  amountAfterDiscount: number;
  gst: number;
  finalTotal: number;
  createdAt: string;
}

export function createInitialWorkshops(): Workshop[] {
  return [
    {
      id: 101,
      name: 'Python for Data Science',
      category: 'Technical',
      fee: 800,
      initialSeats: 40,
      availableSeats: 40,
      seatsBooked: 0,
    },
    {
      id: 102,
      name: 'Web Development Basics',
      category: 'Technical',
      fee: 600,
      initialSeats: 40,
      availableSeats: 40,
      seatsBooked: 0,
    },
    {
      id: 103,
      name: 'Public Speaking',
      category: 'Soft Skill',
      fee: 400,
      initialSeats: 30,
      availableSeats: 30,
      seatsBooked: 0,
    },
    {
      id: 104,
      name: 'Machine Learning Bootcamp',
      category: 'Technical',
      fee: 1500,
      initialSeats: 25,
      availableSeats: 25,
      seatsBooked: 0,
    },
    {
      id: 105,
      name: 'Resume Building',
      category: 'Career',
      fee: 300,
      initialSeats: 50,
      availableSeats: 50,
      seatsBooked: 0,
    },
    {
      id: 106,
      name: 'Ethical Hacking Intro',
      category: 'Technical',
      fee: 1200,
      initialSeats: 20,
      availableSeats: 20,
      seatsBooked: 0,
    },
  ];
}

export function getWorkshopStatus(availableSeats: number): 'LOW' | 'OK' {
  return availableSeats < LOW_SEATS_LIMIT ? 'LOW' : 'OK';
}

export function getDiscountRate(type: ParticipantType): number {
  return type === ParticipantType.Student
    ? STUDENT_DISCOUNT_RATE
    : PROFESSIONAL_DISCOUNT_RATE;
}

export function getParticipantTypeLabel(type: ParticipantType): string {
  return type === ParticipantType.Student ? 'Student' : 'Professional';
}

export function determineHall(token: number): 'A' | 'B' {
  return (token & 1) === 1 ? 'A' : 'B';
}

// Recursive subtotal matching Registration.calculateSubtotal(int index)
export function calculateSubtotalRecursive(lines: OrderLine[], index = 0): number {
  if (index >= lines.length) {
    return 0;
  }
  return lines[index].fee * lines[index].quantity + calculateSubtotalRecursive(lines, index + 1);
}

export function computeBillingBreakdown(lines: OrderLine[], type: ParticipantType) {
  const subtotal = calculateSubtotalRecursive(lines, 0);
  const discountRate = getDiscountRate(type);
  const discount = subtotal * discountRate;
  const amountAfterDiscount = subtotal - discount;
  const gst = amountAfterDiscount * GST;
  const finalTotal = amountAfterDiscount + gst;

  return {
    subtotal,
    discountRate,
    discount,
    amountAfterDiscount,
    gst,
    finalTotal,
  };
}

export function formatMoney(amount: number): string {
  const safeAmount = Math.abs(amount) < 0.005 ? 0 : amount;
  return safeAmount.toFixed(2);
}

export function formatPlainTextBill(reg: Registration): string {
  const discountPct = Math.round(reg.discountRate * 100);
  const gstPct = Math.round(GST * 100);
  const signedDiscount = reg.discount > 0 ? `-${formatMoney(reg.discount)}` : formatMoney(0);

  const padRight = (text: string, width: number) =>
    text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);
  const padLeft = (text: string, width: number) =>
    text.length >= width ? text : ' '.repeat(width - text.length) + text;

  const lines: string[] = [
    '================== SKILLUP - WORKSHOP BILL ==================',
    `Registration ID : ${reg.registrationId}`,
    `Token Number    : ${reg.tokenNumber}`,
    `Hall            : Hall ${reg.hall}`,
    `Participant     : ${reg.participantName} (${getParticipantTypeLabel(reg.participantType)})`,
    '-------------------------------------------------------------',
    `${padRight('Workshop', 28)} ${padLeft('Qty', 4)} ${padLeft('Fee', 10)} ${padLeft('Amount', 11)}`,
  ];

  for (const item of reg.lines) {
    lines.push(
      `${padRight(item.workshopName, 28)} ${padLeft(String(item.quantity), 4)} ${padLeft(
        formatMoney(item.fee),
        10
      )} ${padLeft(formatMoney(item.fee * item.quantity), 11)}`
    );
  }

  lines.push(
    '-------------------------------------------------------------',
    `${padRight('Subtotal', 44)} ${padLeft(formatMoney(reg.subtotal), 11)}`,
    `${padRight(`Discount (${discountPct}%)`, 44)} ${padLeft(signedDiscount, 11)}`,
    `${padRight('Amount after discount', 44)} ${padLeft(formatMoney(reg.amountAfterDiscount), 11)}`,
    `${padRight(`GST (${gstPct}%)`, 44)} ${padLeft(formatMoney(reg.gst), 11)}`,
    `${padRight('FINAL TOTAL (Rs.)', 44)} ${padLeft(formatMoney(reg.finalTotal), 11)}`,
    '============================================================='
  );

  return lines.join('\n');
}

export function findMostPopularWorkshop(workshops: Workshop[]): Workshop | null {
  let mostPopular: Workshop | null = null;
  let highestBooked = 0;

  for (const w of workshops) {
    // Strict '>' preserves first-in-list tie-breaker
    if (w.seatsBooked > highestBooked) {
      highestBooked = w.seatsBooked;
      mostPopular = w;
    }
  }
  return mostPopular;
}

export function formatPlainTextReport(
  registrations: Registration[],
  workshops: Workshop[]
): string {
  const lines: string[] = ['============ SKILLUP - REGISTRATION REPORT ============'];

  if (registrations.length === 0) {
    lines.push('No registrations yet.');
    lines.push('=======================================================');
    return lines.join('\n') + '\n';
  }

  const totalRevenue = registrations.reduce((sum, r) => sum + r.finalTotal, 0);
  const popular = findMostPopularWorkshop(workshops);

  lines.push(`Total registrations       : ${registrations.length}`);
  lines.push(`Total revenue (incl. GST) : Rs. ${formatMoney(totalRevenue)}`);
  if (popular) {
    lines.push(
      `Most popular workshop     : ${popular.name} (${popular.seatsBooked} seats booked)`
    );
  }
  lines.push('=======================================================');

  return lines.join('\n') + '\n';
}
