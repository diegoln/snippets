const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find Jack user
  const jack = await prisma.user.findUnique({ 
    where: { email: 'jack@example.com' },
    include: {
      reflections: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          integrationConsolidations: true
        }
      },
      integrationConsolidations: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  
  if (!jack) {
    console.log('Jack user not found');
    return;
  }
  
  console.log('=== Jack User Analysis ===');
  console.log('User ID:', jack.id);
  console.log('Email:', jack.email);
  
  console.log('\n=== Latest Reflection ===');
  if (jack.reflections.length > 0) {
    const reflection = jack.reflections[0];
    console.log('Reflection ID:', reflection.id);
    console.log('Created:', reflection.createdAt);
    console.log('Type:', reflection.type);
    console.log('Has consolidations linked:', reflection.integrationConsolidations.length > 0);
    console.log('Number of consolidations:', reflection.integrationConsolidations.length);
    console.log('Content preview:', reflection.content.substring(0, 500) + '...');
    
    // Check if reflection mentions calendar data
    const hasCalendarMentions = reflection.content.toLowerCase().includes('meeting') || 
                                reflection.content.toLowerCase().includes('calendar') ||
                                reflection.content.toLowerCase().includes('schedule');
    console.log('Contains calendar-related keywords:', hasCalendarMentions);
  } else {
    console.log('No reflections found');
  }
  
  console.log('\n=== Latest Integration Consolidation ===');
  if (jack.integrationConsolidations.length > 0) {
    const consolidation = jack.integrationConsolidations[0];
    console.log('Consolidation ID:', consolidation.id);
    console.log('Created:', consolidation.createdAt);
    console.log('Integration Type:', consolidation.integrationType);
    console.log('Status:', consolidation.status);
    if (consolidation.themes) {
      const themes = JSON.parse(consolidation.themes);
      console.log('Themes found:', themes.length);
      console.log('Theme categories:', themes.map(t => t.category).join(', '));
    }
    if (consolidation.rawData) {
      const rawData = JSON.parse(consolidation.rawData);
      console.log('Raw data events count:', rawData.events ? rawData.events.length : 0);
    }
  } else {
    console.log('No consolidations found');
  }
  
  // Check the relationship between reflection and consolidation
  console.log('\n=== Reflection-Consolidation Relationship ===');
  const latestReflection = jack.reflections[0];
  if (latestReflection && latestReflection.integrationConsolidations.length > 0) {
    console.log('Reflection IS linked to consolidations');
    latestReflection.integrationConsolidations.forEach(c => {
      console.log(`- Consolidation ${c.id} (${c.integrationType})`);
    });
  } else {
    console.log('Reflection is NOT linked to any consolidations');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);