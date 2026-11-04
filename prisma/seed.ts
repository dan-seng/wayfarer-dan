import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding database...");

  // Clear existing data in reverse order of foreign keys
  await prisma.booking.deleteMany();
  await prisma.tourSlot.deleteMany();
  await prisma.review.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users (Matching UI sketch: Sara, Abel, Liya)
  const sara = await prisma.user.create({
    data: { name: "Sara" },
  });
  const abel = await prisma.user.create({
    data: { name: "Abel" },
  });
  const liya = await prisma.user.create({
    data: { name: "Liya" },
  });

  // Additional reviewer user accounts for authentic crowd ratings
  const extraUsers = await Promise.all(
    ["Dawit", "Hanna", "Yonas", "Bethlehem", "Tewodros", "Meron", "Kaleb"].map(
      (name) => prisma.user.create({ data: { name } })
    )
  );

  const allUsers = [sara, abel, liya, ...extraUsers];

  // 2. Seed Places
  const nationalMuseum = await prisma.place.create({
    data: {
      name: "National Museum",
      category: "History",
      description:
        "Home to the famous fossil of 'Lucy' (Dinkinesh) and a wealth of Ethiopian historical artifacts spanning centuries.",
      openingHours: "Open 08:30–17:30",
    },
  });

  const holyTrinity = await prisma.place.create({
    data: {
      name: "Holy Trinity Cathedral",
      category: "History",
      description:
        "Historic cathedral famous for its baroque architecture, ornate murals, and imperial tombs of Emperor Haile Selassie.",
      openingHours: "Open 08:00–18:00",
    },
  });

  const entotoPark = await prisma.place.create({
    data: {
      name: "Entoto Park",
      category: "Nature",
      description:
        "A sprawling eucalyptus-covered ridge overlooking Addis Ababa, featuring hiking trails, viewpoints, and fresh mountain air.",
      openingHours: "Open 06:00–21:00",
    },
  });

  const cornerCoffee = await prisma.place.create({
    data: {
      name: "Corner Coffee House",
      category: "Food",
      description:
        "A bustling local hub serving traditional single-origin pour-overs, freshly roasted beans, and spiced teas.",
      openingHours: "Open 07:00–22:00",
    },
  });

  // Benchmark place: single 5-star review that shouldn't beat established places
  const brandNewCafe = await prisma.place.create({
    data: {
      name: "Brand-new café",
      category: "Food",
      description:
        "A freshly opened boutique pastry and espresso bar with stylish minimalist decor.",
      openingHours: "Open 08:00–20:00",
    },
  });

  const unityPark = await prisma.place.create({
    data: {
      name: "Unity Park",
      category: "Nature",
      description:
        "Extensive landscaped gardens, historical palace pavilions, and a zoo inside the Grand National Palace complex.",
      openingHours: "Open 09:00–18:00",
    },
  });

  const redTerrorMemorial = await prisma.place.create({
    data: {
      name: "Red Terror Martyrs' Memorial Museum",
      category: "History",
      description:
        "A moving, solemn memorial museum preserving the memories and artifacts of the victims of the Derg regime.",
      openingHours: "Open 08:30–17:00",
    },
  });

  const tomocaCoffee = await prisma.place.create({
    data: {
      name: "Tomoca Coffee Roastery",
      category: "Food",
      description:
        "The oldest and most iconic Italian-style coffee roaster in the city, operating since 1953.",
      openingHours: "Open 06:30–20:30",
    },
  });

  const mountEntotoNaturalSprings = await prisma.place.create({
    data: {
      name: "Mount Entoto Natural Springs",
      category: "Nature",
      description:
        "Natural hot spring baths and scenic highland walking trails surrounded by pristine eucalyptus forests.",
      openingHours: "Open 07:00–18:00",
    },
  });

  const stGeorgesCathedral = await prisma.place.create({
    data: {
      name: "St. George's Cathedral",
      category: "History",
      description:
        "Distinctive octagonal cathedral founded in 1896, showcasing traditional ecclesiastical art and museum treasures.",
      openingHours: "Open 08:00–17:00",
    },
  });

  // 3. Seed Reviews
  // Brand-new café has exactly 1 review (5 stars)
  await prisma.review.create({
    data: {
      placeId: brandNewCafe.id,
      userId: sara.id,
      rating: 5,
      body: "Just opened today! Incredible espresso and friendly service.",
    },
  });

  // National Museum reviews (including exact text from sketch)
  await prisma.review.create({
    data: {
      placeId: nationalMuseum.id,
      userId: abel.id,
      rating: 5,
      body: "Go early, the guide is excellent.",
    },
  });
  await prisma.review.create({
    data: {
      placeId: nationalMuseum.id,
      userId: liya.id,
      rating: 4,
      body: "Great, but the café was closed.",
    },
  });

  // Distribute reviews across other places from other users
  const placeReviewConfigs = [
    { place: nationalMuseum, ratings: [5, 5, 4, 5, 5, 4, 5] },
    { place: holyTrinity, ratings: [5, 4, 5, 4, 5, 4] },
    { place: entotoPark, ratings: [5, 4, 4, 5, 4] },
    { place: cornerCoffee, ratings: [4, 4, 5, 4, 5, 4, 4] },
    { place: unityPark, ratings: [5, 5, 4, 5] },
    { place: redTerrorMemorial, ratings: [5, 5, 5, 4] },
    { place: tomocaCoffee, ratings: [5, 5, 4, 5, 4] },
    { place: mountEntotoNaturalSprings, ratings: [4, 4, 5] },
    { place: stGeorgesCathedral, ratings: [5, 4, 5] },
  ];

  for (const config of placeReviewConfigs) {
    for (let i = 0; i < config.ratings.length; i++) {
      const user = extraUsers[i % extraUsers.length];
      const rating = config.ratings[i];
      // Check if user already reviewed this place in this script
      const existing = await prisma.review.findUnique({
        where: {
          placeId_userId: {
            placeId: config.place.id,
            userId: user.id,
          },
        },
      });
      if (!existing) {
        await prisma.review.create({
          data: {
            placeId: config.place.id,
            userId: user.id,
            rating,
            body: `Wonderful experience at ${config.place.name}! Highly recommended.`,
          },
        });
      }
    }
  }

  // 4. Seed Tour Slots for National Museum (matching UI sketch exactly)
  // Saturday 09:00 (10 capacity, 6 booked -> 4 left)
  const sat09 = new Date();
  sat09.setDate(sat09.getDate() + ((6 - sat09.getDay() + 7) % 7)); // Next Saturday
  sat09.setHours(9, 0, 0, 0);

  const slot1 = await prisma.tourSlot.create({
    data: {
      placeId: nationalMuseum.id,
      startsAt: sat09,
      capacity: 10,
    },
  });
  // 6 booked seats
  await prisma.booking.create({
    data: { slotId: slot1.id, userId: abel.id, seats: 4 },
  });
  await prisma.booking.create({
    data: { slotId: slot1.id, userId: liya.id, seats: 2 },
  });

  // Saturday 11:00 (10 capacity, 9 booked -> 1 of 10 seats left)
  const sat11 = new Date(sat09);
  sat11.setHours(11, 0, 0, 0);

  const slot2 = await prisma.tourSlot.create({
    data: {
      placeId: nationalMuseum.id,
      startsAt: sat11,
      capacity: 10,
    },
  });
  // 9 booked seats (1 left)
  await prisma.booking.create({
    data: { slotId: slot2.id, userId: extraUsers[0].id, seats: 5 },
  });
  await prisma.booking.create({
    data: { slotId: slot2.id, userId: extraUsers[1].id, seats: 4 },
  });

  // Saturday 14:00 (10 capacity, 10 booked -> Fully booked)
  const sat14 = new Date(sat09);
  sat14.setHours(14, 0, 0, 0);

  const slot3 = await prisma.tourSlot.create({
    data: {
      placeId: nationalMuseum.id,
      startsAt: sat14,
      capacity: 10,
    },
  });
  // 10 booked seats
  await prisma.booking.create({
    data: { slotId: slot3.id, userId: extraUsers[2].id, seats: 5 },
  });
  await prisma.booking.create({
    data: { slotId: slot3.id, userId: extraUsers[3].id, seats: 5 },
  });

  // Additional slots for other places
  const sunday10 = new Date(sat09);
  sunday10.setDate(sunday10.getDate() + 1);
  sunday10.setHours(10, 0, 0, 0);

  await prisma.tourSlot.create({
    data: {
      placeId: entotoPark.id,
      startsAt: sunday10,
      capacity: 15,
    },
  });

  await prisma.tourSlot.create({
    data: {
      placeId: unityPark.id,
      startsAt: sunday10,
      capacity: 20,
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
