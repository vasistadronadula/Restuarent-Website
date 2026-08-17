import React from 'react';
import {
  CheckCircle2,
  CookingPot,
  Flame,
  ShoppingBag,
  Sparkles,
  CupSoda,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { OrderStatus } from '@/types';

export type OrderCategoryType = 'food' | 'dessert' | 'beverage' | 'dessert_and_beverage';

export interface StageDefinition {
  key: OrderStatus;
  label: string;
  shortTitle: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const DESSERT_KEYWORDS = [
  'dessert', 'sweet', 'meetha', 'delight', 'jamun', 'bobbatlu', 'payasam', 'kheer',
  'halwa', 'ice cream', 'icecream', 'rasmalai', 'pudding', 'pastry', 'brownie',
  'apricot', 'qubani', 'falooda', 'kulfi', 'rasgulla', 'laddu', 'mysore pak'
];

const BEVERAGE_KEYWORDS = [
  'beverage', 'drink', 'cool drink', 'cooldrink', 'soda', 'water', 'thums up', 'thumps up',
  'sprite', 'coke', 'coca cola', 'fanta', 'limca', 'badam milk', 'lassi', 'buttermilk',
  'butter milk', 'mojito', 'juice', 'shake', 'tea', 'coffee', 'soup', 'pepsi', 'mirinda',
  'maaza', 'mineral water'
];

/**
 * Classifies an order based on the items it contains.
 */
export function classifyOrderCategory(
  items?: Array<{ name?: string; category?: string; menuItemId?: string }>
): OrderCategoryType {
  if (!items || items.length === 0) return 'food';

  let hasFood = false;
  let hasDessert = false;
  let hasBeverage = false;

  for (const item of items) {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    const isDessert =
      cat === 'desserts' ||
      DESSERT_KEYWORDS.some((kw) => name.includes(kw) || cat.includes(kw));

    const isBeverage =
      cat === 'beverages' ||
      BEVERAGE_KEYWORDS.some((kw) => name.includes(kw) || cat.includes(kw));

    if (isDessert) {
      hasDessert = true;
    } else if (isBeverage) {
      hasBeverage = true;
    } else {
      hasFood = true;
    }
  }

  if (hasFood) return 'food';
  if (hasDessert && hasBeverage) return 'dessert_and_beverage';
  if (hasDessert) return 'dessert';
  if (hasBeverage) return 'beverage';
  return 'food';
}

/**
 * Return customized stage definitions tailored to the category of items in the order.
 */
export function getOrderStages(categoryType: OrderCategoryType = 'food'): readonly StageDefinition[] {
  switch (categoryType) {
    case 'dessert':
      return [
        {
          key: 'pending',
          label: 'Order confirmed',
          shortTitle: 'Confirmed',
          desc: 'The dessert counter has your ticket',
          icon: CheckCircle2,
        },
        {
          key: 'preparing',
          label: 'Plating & Garnishing',
          shortTitle: 'Plating',
          desc: 'Scooping, plating & garnishing sweet treats fresh',
          icon: Sparkles,
        },
        {
          key: 'ready',
          label: 'Ready for pickup',
          shortTitle: 'Ready',
          desc: 'Freshly plated and packed at the counter',
          icon: CheckCircle2,
        },
        {
          key: 'delivered',
          label: 'Collected',
          shortTitle: 'Done',
          desc: 'Enjoy your delicious desserts!',
          icon: ShoppingBag,
        },
      ];

    case 'beverage':
      return [
        {
          key: 'pending',
          label: 'Order confirmed',
          shortTitle: 'Confirmed',
          desc: 'The beverage counter has your ticket',
          icon: CheckCircle2,
        },
        {
          key: 'preparing',
          label: 'Chilling & Pouring',
          shortTitle: 'Chilling',
          desc: 'Pouring & chilling beverages ice-cold',
          icon: CupSoda,
        },
        {
          key: 'ready',
          label: 'Chilled & Ready',
          shortTitle: 'Ready',
          desc: 'Chilled, sealed and waiting at the counter',
          icon: CupSoda,
        },
        {
          key: 'delivered',
          label: 'Collected',
          shortTitle: 'Done',
          desc: 'Stay refreshed & enjoy!',
          icon: ShoppingBag,
        },
      ];

    case 'dessert_and_beverage':
      return [
        {
          key: 'pending',
          label: 'Order confirmed',
          shortTitle: 'Confirmed',
          desc: 'The counter has your ticket',
          icon: CheckCircle2,
        },
        {
          key: 'preparing',
          label: 'Plating & Chilling',
          shortTitle: 'Preparing',
          desc: 'Plating desserts & chilling beverages fresh',
          icon: Sparkles,
        },
        {
          key: 'ready',
          label: 'Ready for pickup',
          shortTitle: 'Ready',
          desc: 'Packed and waiting at the counter',
          icon: CheckCircle2,
        },
        {
          key: 'delivered',
          label: 'Collected',
          shortTitle: 'Done',
          desc: 'Enjoy your dessert and drinks!',
          icon: ShoppingBag,
        },
      ];

    case 'food':
    default:
      return [
        {
          key: 'pending',
          label: 'Order confirmed',
          shortTitle: 'Confirmed',
          desc: 'The kitchen has your ticket',
          icon: CheckCircle2,
        },
        {
          key: 'preparing',
          label: 'Cooking now',
          shortTitle: 'Cooking',
          desc: 'Your dishes are on the stove',
          icon: Flame,
        },
        {
          key: 'ready',
          label: 'Ready for pickup',
          shortTitle: 'Ready',
          desc: 'Packed and waiting at the counter',
          icon: CookingPot,
        },
        {
          key: 'delivered',
          label: 'Collected',
          shortTitle: 'Done',
          desc: 'Thanks for eating with us',
          icon: ShoppingBag,
        },
      ];
  }
}

/**
 * Returns dynamic status metadata (label, icon, colors) for order badges.
 */
export function getStatusBadgeMeta(status: string, categoryType: OrderCategoryType = 'food') {
  if (status === 'preparing') {
    if (categoryType === 'beverage') {
      return {
        label: 'Chilling',
        icon: CupSoda,
        colors: 'text-sky-800 bg-sky-50 border-sky-200',
      };
    }
    if (categoryType === 'dessert') {
      return {
        label: 'Plating',
        icon: Sparkles,
        colors: 'text-amber-800 bg-amber-50 border-amber-200',
      };
    }
    if (categoryType === 'dessert_and_beverage') {
      return {
        label: 'Preparing',
        icon: Sparkles,
        colors: 'text-purple-800 bg-purple-50 border-purple-200',
      };
    }
    return {
      label: 'Cooking',
      icon: Flame,
      colors: 'text-brand-800 bg-brand-50 border-brand-200',
    };
  }

  if (status === 'ready') {
    if (categoryType === 'beverage') {
      return {
        label: 'Chilled & Ready',
        icon: CupSoda,
        colors: 'text-teal-800 bg-teal-50 border-teal-200',
      };
    }
    if (categoryType === 'dessert') {
      return {
        label: 'Ready to collect',
        icon: CheckCircle2,
        colors: 'text-brand-800 bg-brand-50 border-brand-200',
      };
    }
    return {
      label: 'Ready to collect',
      icon: CookingPot,
      colors: 'text-brand-800 bg-brand-50 border-brand-200',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Confirmed',
      icon: Clock,
      colors: 'text-brand-800 bg-brand-50 border-brand-200',
    };
  }

  if (status === 'delivered') {
    return {
      label: 'Completed',
      icon: CheckCircle2,
      colors: 'text-veg bg-veg/8 border-veg/25',
    };
  }

  return {
    label: 'Cancelled',
    icon: AlertCircle,
    colors: 'text-nonveg bg-nonveg/8 border-nonveg/25',
  };
}
