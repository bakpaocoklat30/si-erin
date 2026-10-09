fetch("http://localhost:3000/api/pokja/events")
  .then(r => r.json())
  .then(async data => {
    const ev = data.data[0];
    console.log("Editing event:", ev.id);
    
    const res = await fetch(`http://localhost:3000/api/pokja/events/${ev.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Test Update",
        startDate: "2026-10-20",
        endDate: "2026-10-25",
        location: "Test Location",
        letterIntro: "Test Intro"
      })
    });
    
    const d = await res.json();
    console.log("Result:", d);
  })
  .catch(console.error);