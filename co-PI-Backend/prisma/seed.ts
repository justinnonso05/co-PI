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
  const upsertUser = async (email: string, firstName: string, lastName: string, university: string, faculty: string, department: string) => {
    return prisma.user.upsert({
      where: { email },
      update: {}, // Don't overwrite existing data if user already exists
      create: {
        email,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        university,
        faculty,
        department
      }
    });
  };

  // 10 Users
  // 4 from University of Lagos
  const unilagUsers = await Promise.all([
    upsertUser('unilag1@test.com', 'Tunde', 'Adeyemi', 'University of Lagos', 'Science', 'Computer Science'),
    upsertUser('unilag2@test.com', 'Ngozi', 'Okafor', 'University of Lagos', 'Engineering', 'Electrical Engineering'),
    upsertUser('unilag3@test.com', 'Aisha', 'Bello', 'University of Lagos', 'Arts', 'English'),
    upsertUser('unilag4@test.com', 'Chinedu', 'Eze', 'University of Lagos', 'Medicine', 'Anatomy'),
  ]);

  // 4 from University of Abuja
  const uniabujaUsers = await Promise.all([
    upsertUser('uniabuja1@test.com', 'Ibrahim', 'Musa', 'University of Abuja', 'Social Sciences', 'Economics'),
    upsertUser('uniabuja2@test.com', 'Fatima', 'Abdullahi', 'University of Abuja', 'Law', 'Public Law'),
    upsertUser('uniabuja3@test.com', 'Emeka', 'Nwosu', 'University of Abuja', 'Science', 'Physics'),
    upsertUser('uniabuja4@test.com', 'Zainab', 'Aliyu', 'University of Abuja', 'Education', 'Science Education'),
  ]);

  // 2 from University of Ibadan
  const uiUsers = await Promise.all([
    upsertUser('ui1@test.com', 'Olumide', 'Ogunleye', 'University of Ibadan', 'Agriculture', 'Agronomy'),
    upsertUser('ui2@test.com', 'Folake', 'Adebayo', 'University of Ibadan', 'Public Health', 'Epidemiology'),
  ]);

  console.log('✅ Upserted 10 users across 3 universities safely.');
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
      university: 'University of Lagos',
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
      university: 'University of Lagos',
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
      university: 'University of Lagos',
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
      university: 'University of Abuja',
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
      university: 'University of Abuja',
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
      university: 'University of Ibadan',
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
      university: 'University of Ibadan',
      status: 'DRAFT',
      members: {
        create: [
          { userId: uiUsers[1].id, role: 'PI' },
          { userId: uiUsers[0].id, role: 'CO_INVESTIGATOR' },
        ]
      }
    }
  });

  console.log('✅ Created 7 projects assigned by university.');
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
