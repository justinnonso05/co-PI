import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import process from 'process';

import 'dotenv/config';
import { prisma } from '../src/db';

async function main() {
  console.log('🌱 Starting non-destructive database seed...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  console.log('Upserting users safely...');

  // Helper function to safely upsert a user
  const upsertUser = async (email: string, firstName: string, lastName: string) => {
    return prisma.user.upsert({
      where: { email },
      update: {}, // Don't overwrite existing data if user already exists
      create: {
        email,
        firstName,
        lastName,
        passwordHash: hashedPassword
      }
    });
  };

  // 10 Users
  // 4 from University of Lagos
  const unilagUsers = await Promise.all([
    upsertUser('unilag1@test.com', 'Tunde', 'Adeyemi'),
    upsertUser('unilag2@test.com', 'Ngozi', 'Okafor'),
    upsertUser('unilag3@test.com', 'Aisha', 'Bello'),
    upsertUser('unilag4@test.com', 'Chinedu', 'Eze'),
  ]);

  // 4 from University of Abuja
  const uniabujaUsers = await Promise.all([
    upsertUser('uniabuja1@test.com', 'Ibrahim', 'Musa'),
    upsertUser('uniabuja2@test.com', 'Fatima', 'Abdullahi'),
    upsertUser('uniabuja3@test.com', 'Emeka', 'Nwosu'),
    upsertUser('uniabuja4@test.com', 'Zainab', 'Aliyu'),
  ]);

  // 2 from University of Ibadan
  const uiUsers = await Promise.all([
    upsertUser('ui1@test.com', 'Olumide', 'Ogunleye'),
    upsertUser('ui2@test.com', 'Folake', 'Adebayo'),
  ]);

  console.log('✅ Upserted 10 users safely.');
  console.log('Creating 7 projects...');

  // 7 Projects
  // We use create because we want to add these new sample projects to the existing DB 
  // without deleting anything or causing constraint collisions.

  // UNILAG Projects (3)
  await prisma.project.create({
    data: {
      title: 'AI in Nigerian Healthcare',
      description: 'Investigating the adoption of AI in local hospitals.',
      researchTopic: 'Health Informatics',
      visibility: 'PUBLIC',
      status: 'DRAFT',
      members: {
        create: [
          { userId: unilagUsers[0].id, role: 'PI' },
          { userId: unilagUsers[1].id, role: 'CO_INVESTIGATOR' },
          { userId: unilagUsers[2].id, role: 'RESEARCH_ASSISTANT' },
          { userId: unilagUsers[3].id, role: 'RESEARCH_ASSISTANT' },
        ]
      }
    }
  });

  await prisma.project.create({
    data: {
      title: 'Renewable Energy Solutions',
      description: 'Solar panel efficiency in tropical climates.',
      researchTopic: 'Renewable Energy',
      visibility: 'PUBLIC',
      status: 'DRAFT',
      members: {
        create: [
          { userId: unilagUsers[1].id, role: 'PI' },
          { userId: unilagUsers[0].id, role: 'CO_INVESTIGATOR' },
        ]
      }
    }
  });

  await prisma.project.create({
    data: {
      title: 'Linguistic Diversity in Urban Lagos',
      description: 'Mapping dialects in metropolitan areas.',
      researchTopic: 'Linguistics',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      members: {
        create: [
          { userId: unilagUsers[2].id, role: 'PI' },
          { userId: unilagUsers[3].id, role: 'RESEARCH_ASSISTANT' },
        ]
      }
    }
  });

  // UNIABUJA Projects (2)
  await prisma.project.create({
    data: {
      title: 'Economic Impact of Policy Reforms',
      description: 'Analyzing the recent fiscal policy changes.',
      researchTopic: 'Economics',
      visibility: 'PUBLIC',
      status: 'DRAFT',
      members: {
        create: [
          { userId: uniabujaUsers[0].id, role: 'PI' },
          { userId: uniabujaUsers[1].id, role: 'CO_INVESTIGATOR' },
          { userId: uniabujaUsers[2].id, role: 'RESEARCH_ASSISTANT' },
          { userId: uniabujaUsers[3].id, role: 'REVIEWER' },
        ]
      }
    }
  });

  await prisma.project.create({
    data: {
      title: 'Constitutional Law in the 21st Century',
      description: 'A review of constitutional amendments.',
      researchTopic: 'Law',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      members: {
        create: [
          { userId: uniabujaUsers[1].id, role: 'PI' },
          { userId: uniabujaUsers[0].id, role: 'CO_INVESTIGATOR' },
        ]
      }
    }
  });

  // UI Projects (2)
  await prisma.project.create({
    data: {
      title: 'Sustainable Agriculture Techniques',
      description: 'Improving crop yield using organic methods.',
      researchTopic: 'Agriculture',
      visibility: 'PUBLIC',
      status: 'DRAFT',
      members: {
        create: [
          { userId: uiUsers[0].id, role: 'PI' },
          { userId: uiUsers[1].id, role: 'CO_INVESTIGATOR' },
        ]
      }
    }
  });

  await prisma.project.create({
    data: {
      title: 'Epidemiological Trends 2020-2025',
      description: 'Tracking disease spread post-pandemic.',
      researchTopic: 'Public Health',
      visibility: 'PUBLIC',
      status: 'DRAFT',
      members: {
        create: [
          { userId: uiUsers[1].id, role: 'PI' },
          { userId: uiUsers[0].id, role: 'CO_INVESTIGATOR' },
        ]
      }
    }
  });

  // 10 Generic Users
  const genericUsers = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      upsertUser(
        `user${i + 1}@gmail.com`,
        `Generic`,
        `User${i + 1}`
      )
    )
  );

  console.log('✅ Upserted 10 generic users.');
  console.log('Creating 50 random public repositories...');

  // 50 Random Projects in AI, Health, and Finance
  const domains = [
    {
      topic: 'Artificial Intelligence',
      titles: [
        'AI in Healthcare Diagnostics', 'Machine Learning for Fraud Detection', 'NLP for Indigenous Languages',
        'Computer Vision in Agriculture', 'Ethics of AI in Decision Making', 'Autonomous Drone Navigation',
        'AI-driven Climate Modeling', 'Deep Learning for Genomics', 'Reinforcement Learning in Robotics',
        'Generative AI for Content Creation', 'AI in Predictive Maintenance', 'Smart City Traffic Optimization',
        'AI for Personalized Education', 'Speech Recognition Advancements', 'AI in Financial Forecasting',
        'Cybersecurity Threat Detection', 'AI in Drug Discovery'
      ]
    },
    {
      topic: 'Health & Medicine',
      titles: [
        'Telemedicine Adoption Post-Pandemic', 'Mental Health Support Networks', 'Nutritional Impact on Chronic Illness',
        'Epidemiological Tracking Systems', 'Wearable Health Monitors', 'Maternal Mortality Reduction Strategies',
        'Vaccine Distribution Logistics', 'Genomic Sequencing of Rare Diseases', 'Public Health Policy Evaluation',
        'Aging Population Health Challenges', 'Pediatric Care Innovations', 'Health Information Systems',
        'Infectious Disease Modeling', 'Holistic Wellness Programs', 'Surgical Robotics Efficacy',
        'Patient Data Privacy Frameworks', 'Rehabilitation Technology'
      ]
    },
    {
      topic: 'Finance & Economics',
      titles: [
        'Cryptocurrency Market Volatility', 'Microfinance Impact on SMEs', 'Algorithmic Trading Strategies',
        'Blockchain for Supply Chain Transparency', 'Economic Impacts of Climate Change', 'Financial Literacy Initiatives',
        'Digital Banking Adoption', 'Macroeconomic Policy Analysis', 'Venture Capital Trends',
        'Insurance Tech Innovations', 'Tax Evasion Detection Systems', 'Sustainable Investment Portfolios',
        'Global Trade Flow Dynamics', 'Gig Economy Financial Security', 'Real Estate Market Forecasting',
        'Behavioral Economics in Savings', 'DeFi Protocols Evaluation'
      ]
    }
  ];

  const randomProjects = Array.from({ length: 50 }).map((_, i) => {
    const domain = domains[i % domains.length];
    const titleBase = domain.titles[Math.floor(Math.random() * domain.titles.length)];
    // Add a unique suffix to avoid exact title duplicates if they happen to clash
    const uniqueTitle = `${titleBase} - Study ${Math.floor(Math.random() * 1000)}`;
    const piUser = genericUsers[Math.floor(Math.random() * genericUsers.length)];

    return {
      title: uniqueTitle,
      description: `A comprehensive open-source research initiative exploring the implications and advancements in ${uniqueTitle.toLowerCase()}. We welcome collaborators across disciplines.`,
      researchTopic: domain.topic,
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      members: {
        create: [
          { userId: piUser.id, role: 'PI' }
        ]
      }
    };
  });

  // Insert sequentially to avoid overwhelming the connection pool
  for (const proj of randomProjects) {
    await prisma.project.create({ data: proj });
  }

  console.log('✅ Created 50 random projects assigned to generic users.');
  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
