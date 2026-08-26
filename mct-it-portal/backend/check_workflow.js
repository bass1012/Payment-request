const { getWorkflowSteps, DEPARTMENTS } = require('./src/config/departments');

for (const code of ['INFORMATIQUE', 'SECRETARIAT']) {
  const dept = DEPARTMENTS.find(d => d.code === code);
  console.log('\n--- %s Department ---', code, dept);

  if (dept) {
    const steps = getWorkflowSteps('ENR_RF_002', dept);
    console.log(`Workflow Steps for ENR_RF_002 (${code}):`);
    steps.forEach(s => {
      console.log(`Step ${s.step}: ${s.label} (${s.type}) -> ${s.email} (${s.name})`);
    });
  } else {
    console.log(`${code} department not found!`);
  }
}

