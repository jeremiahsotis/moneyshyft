import { Knex } from 'knex';

export async function createRecommendedTags(
  knex: Knex,
  householdId: string
): Promise<void> {
  const tagGroups = [
    {
      name: 'Housing',
      children: [
        'Mortgage/Rent',
        'Property Taxes',
        'Homeowners Insurance',
        'HOA Fees',
        'Home Repairs/Maintenance',
        'Home Security System',
        'Lawn Care',
        'Pest Control',
        'Home Improvement'
      ]
    },
    {
      name: 'Utilities',
      children: [
        'Electricity',
        'Water',
        'Gas',
        'Trash/Recycling',
        'Internet',
        'Cable/Satellite TV',
        'Phone (Mobile)',
        'Phone (Landline)',
        'Sewer'
      ]
    },
    {
      name: 'Transportation',
      children: [
        'Car Payment',
        'Car Insurance',
        'Gasoline',
        'Public Transportation',
        'Car Maintenance',
        'Car Repairs',
        'Parking Fees',
        'Tolls',
        'Car Registration',
        'Car Washes',
        'Tires'
      ]
    },
    {
      name: 'Food',
      children: [
        'Groceries',
        'Dining Out',
        'Takeout/Delivery',
        'Snacks',
        'Beverages',
        'Pet Food'
      ]
    },
    {
      name: 'Healthcare',
      children: [
        'Health Insurance',
        'Dental Insurance',
        'Vision Insurance',
        'Prescription Medications',
        'Doctor Visits',
        'Dental Care',
        'Vision Care',
        'Medical Devices',
        'Therapy/Counseling',
        'Urgent Care',
        'Alternative Medicine',
        'Medical Procedures'
      ]
    },
    {
      name: 'Insurance',
      children: [
        'Life Insurance',
        'Disability Insurance',
        'Long-Term Care Insurance'
      ]
    },
    {
      name: 'Debt Payments',
      children: [
        'Credit Card Payments',
        'Student Loan Payments',
        'Personal Loan Payments',
        'Mortgage Payments',
        'Auto Loan Payments'
      ]
    },
    {
      name: 'Savings',
      children: [
        'Emergency Fund',
        'Retirement Fund (401(k), IRA, etc.)',
        'General Savings',
        'College Savings',
        'Down Payment Savings',
        'Vacation Fund'
      ]
    },
    {
      name: 'Personal Care',
      children: [
        'Haircuts',
        'Salon Services',
        'Manicures/Pedicures',
        'Skincare Products',
        'Cosmetics',
        'Toiletries',
        'Gym Membership',
        'Fitness Classes',
        'Massage Therapy',
        'Spa Treatments'
      ]
    },
    {
      name: 'Clothing',
      children: [
        "Adults' Clothing",
        "Adults' Shoes",
        "Children's Clothing",
        "Children's Shoes",
        'Work Attire',
        'Accessories'
      ]
    },
    {
      name: 'Entertainment',
      children: [
        'Movies',
        'Concerts',
        'Sporting Events',
        'Books',
        'Magazines',
        'Hobbies',
        'Music',
        'Games (Board Games, Video Games)'
      ]
    },
    {
      name: 'Travel',
      children: [
        'Airfare',
        'Hotel Accommodations',
        'Rental Cars',
        'Travel Insurance',
        'Vacation Activities',
        'Travel Gear'
      ]
    },
    {
      name: 'Education',
      children: [
        'Tuition',
        'School Supplies',
        'Textbooks',
        'Extracurricular Activities',
        'College Activities'
      ]
    },
    {
      name: 'Childcare',
      children: [
        'Daycare',
        'Babysitters',
        'Nanny Services',
        'School Lunches',
        'Summer Camps',
        'Child Support'
      ]
    },
    {
      name: 'Gifts & Donations',
      children: [
        'Birthday Gifts',
        'Holiday Gifts',
        'Wedding Gifts',
        'Anniversary Gifts',
        'Charitable Donations',
        'Fundraising Contributions'
      ]
    },
    {
      name: 'Household Items',
      children: [
        'Cleaning Supplies',
        'Laundry Supplies',
        'Paper Products',
        'Light Bulbs',
        'Batteries',
        'Kitchen Utensils',
        'Small Appliances',
        'Furniture',
        'Linens'
      ]
    },
    {
      name: 'Pet Care',
      children: [
        'Pet Food',
        'Pet Toys',
        'Pet Grooming',
        'Pet Boarding',
        'Veterinary Care',
        'Pet Insurance'
      ]
    },
    {
      name: 'Business Expenses',
      children: [
        'Office Supplies',
        'Business Travel',
        'Professional Dues',
        'Licenses & Permits',
        'Marketing & Advertising',
        'Website Hosting',
        'Software Subscriptions',
        'Client Entertainment'
      ]
    },
    {
      name: 'Miscellaneous',
      children: [
        'Bank Fees',
        'Postage',
        'Printing',
        'Legal Fees',
        'Accounting Fees',
        'Safety Deposit Box'
      ]
    },
    {
      name: 'Technology',
      children: [
        'Gadgets (Phones, Tablets, etc.)',
        'Computer Software',
        'Computer Hardware',
        'Tech Support',
        'Online Services',
        'Apps'
      ]
    },
    {
      name: 'Emergency Preparedness',
      children: [
        'Emergency Supplies',
        'First Aid Kit',
        'Backup Generator',
        'Fire Extinguisher'
      ]
    },
    {
      name: 'Home Office',
      children: [
        'Office Furniture',
        'Office Supplies',
        'Internet Service',
        'Printer Ink',
        'Professional Development'
      ]
    },
    {
      name: 'Special Occasions',
      children: [
        'Party Supplies',
        'Decorations',
        'Special Meals',
        'Event Tickets'
      ]
    },
    {
      name: 'Seasonal Expenses',
      children: [
        'Holiday Decorations',
        'Seasonal Clothing',
        'Seasonal Activities',
        'Gardening Supplies'
      ]
    },
    {
      name: 'Financial Planning',
      children: [
        'Financial Advisor Fees',
        'Investment Fees',
        'Estate Planning'
      ]
    },
    {
      name: 'Legal',
      children: [
        'Legal Retainer',
        'Will Preparation',
        'Court Fees'
      ]
    },
    {
      name: 'Social',
      children: [
        'Dining Out With Friends',
        'Club Memberships',
        'Social Events',
        'Networking Events'
      ]
    },
    {
      name: 'Religious',
      children: [
        'Tithes/Offerings',
        'Religious Materials',
        'Retreats'
      ]
    },
    {
      name: 'Outdoor Recreation',
      children: [
        'Camping Gear',
        'Fishing Gear',
        'Sports Equipment',
        'Park Fees'
      ]
    },
    {
      name: 'Subscriptions & Memberships',
      children: [
        'Gym Memberships',
        'Professional Memberships',
        'Magazine Subscriptions',
        'Streaming Services',
        'Subscriptions'
      ]
    }
  ];

  let sortOrder = 1;

  for (const group of tagGroups) {
    const [parent] = await knex('tags')
      .insert({
        household_id: householdId,
        name: group.name,
        parent_tag_id: null,
        sort_order: sortOrder,
        is_active: true
      })
      .returning('*');

    let childOrder = 1;
    for (const child of group.children) {
      await knex('tags')
        .insert({
          household_id: householdId,
          name: child,
          parent_tag_id: parent.id,
          sort_order: childOrder,
          is_active: true
        });
      childOrder += 1;
    }

    sortOrder += 1;
  }
}
