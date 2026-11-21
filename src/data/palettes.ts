/* Curated palettes for the Explore page.
   Format: name | style tags (comma separated) | hex codes (dash separated, no #).
   Colour family, temperature, lightness and colour count tags are derived automatically. */

const RAW = `
Harbour Dawn|calm,coastal|0b2545-13315c-8da9c4-eef4ed-f4d35e
Terracotta Studio|earthy,warm|3d2c2e-a4161a-e07a5f-f2cc8f-f4f1de
Sage Kitchen|natural,calm|344e41-3a5a40-588157-a3b18a-dad7cd
Midnight Neon|neon,bold|0d0221-261447-ff3864-2de2e6-f6019d
Desert Bloom|earthy,warm|6b4226-c97c5d-e8b298-f2d0a9-a3b18a
Nordic Frost|minimal,cool|2e3440-4c566a-88c0d0-d8dee9-eceff4
Citrus Market|bright,playful|ff6b35-f7c59f-efefd0-004e89-1a659e
Forest Cabin|natural,dark|1b2d2a-2f4f4f-5c7457-c6ac8f-eae0d5
Lavender Fields|pastel,soft|3c1642-6c4675-b8a1d9-e2d4f5-fbf8ff
Coral Reef|coastal,bright|05668d-028090-00a896-02c39a-f0f3bd
Espresso Bar|coffee,warm|1c0f0a-3c2415-6f4e37-b08968-ede0d4
Sunset Boulevard|retro,warm|2d1e2f-6a2c70-b83b5e-f08a5d-f9ed69
Mint Condition|fresh,pastel|0b3d2e-1f7a5c-74c69d-c7f9cc-f7fff7
Ink & Paper|minimal,mono|111111-3a3a3a-8a8a8a-d9d9d9-faf9f6
Berry Smoothie|bold,playful|3a0ca3-7209b7-b5179e-f72585-ffd6e8
Olive Grove|earthy,natural|283618-606c38-a3a380-dda15e-fefae0
Arctic Lagoon|cool,calm|012a4a-013a63-2a6f97-61a5c2-a9d6e5
Peach Fuzz|pastel,warm|6d597a-b56576-e56b6f-eaac8b-ffcdb2
Granite Office|corporate,minimal|1f2933-3e4c59-7b8794-cbd2d9-f5f7fa
Tropical Punch|bright,summer|ff595e-ffca3a-8ac926-1982c4-6a4c93
Rose Gold|elegant,wedding|4a2c2a-a86f63-d4a59a-ecd2c9-faf3f0
Deep Ocean|dark,cool|03045e-023e8a-0077b6-0096c7-48cae4
Autumn Harvest|autumn,warm|582f0e-7f4f24-936639-a68a64-b6ad90
Bubblegum Pop|pastel,playful|ff99c8-fcf6bd-d0f4de-a9def9-e4c1f9
Charcoal & Mustard|bold,modern|222222-3b3b3b-e0a100-f4d35e-f6f4ef
Moss & Stone|natural,calm|2f3e46-354f52-52796f-84a98c-cad2c5
Electric Violet|neon,bold|10002b-3c096c-7b2cbf-c77dff-e0aaff
Vintage Postcard|retro,soft|264653-2a9d8f-e9c46a-f4a261-e76f51
Cherry Blossom|pastel,spring|5e3c58-c06c84-f8b195-f67280-fde2e4
Slate Blue|corporate,cool|1d3557-457b9d-a8dadc-f1faee-e63946
Honey Bee|warm,playful|2b2118-6f4518-f8b400-ffd166-fff8e7
Glacier|cool,minimal|0f4c5c-5f8a8b-a3c4bc-d6e6e3-f7fbfa
Spice Route|warm,earthy|370617-6a040f-9d0208-dc2f02-f48c06
Matcha Latte|natural,soft|3f4a2b-6b7f3a-a7b77a-dfe3c0-f6f3e7
Cyberpunk Alley|neon,dark|0b0c10-1f2833-c5c6c7-66fcf1-45a29e
Blush & Navy|elegant,modern|14213d-2b3a67-e8a0a8-f7d6d0-fdf6f0
Cactus Garden|natural,desert|354f52-6b9080-a4c3b2-eaf4f4-e6aace
Lemon Sorbet|pastel,summer|f6f7d7-fcf5c7-ffee93-ffc09f-adf7b6
Royal Velvet|elegant,dark|1a0933-3d1766-6b2fa3-b388eb-f1e4ff
Seaside Cottage|coastal,soft|1b4965-5fa8d3-bee9e8-cae9ff-f8f9fa
Rust Belt|industrial,warm|2b2d42-8d99ae-edf2f4-d64933-a3320b
Pine & Snow|winter,natural|0b3c2c-1e5945-6a8d73-dde5e2-ffffff
Flamingo Club|retro,bright|0a2342-2ca58d-84bc9c-fffdf7-f46197
Cocoa Butter|warm,soft|4e342e-795548-a1887f-d7ccc8-efebe9
Ultramarine|bold,cool|0a1172-1c2fd9-4f6df5-a5b4fc-eef2ff
Wildflower Meadow|spring,playful|ffbe0b-fb5607-ff006e-8338ec-3a86ff
Smoky Quartz|elegant,mono|2b2a2a-4b4848-857c7c-c2b9b0-ece7e1
Tidepool|coastal,calm|073b4c-118ab2-06d6a0-ffd166-ef476f
Saffron Silk|warm,elegant|5f0f40-9a031e-fb8b24-e36414-0f4c5c
Clay Pottery|earthy,warm|5c3d2e-b85c38-e0c3a6-f2e5d5-2d2424
Polar Night|dark,cool|0d1b2a-1b263b-415a77-778da9-e0e1dd
Watermelon|summer,playful|2d6a4f-52b788-d8f3dc-ff8fa3-ef233c
Lilac Mist|pastel,calm|6d6875-b5838d-e5989b-ffb4a2-ffcdb2
Fintech Blue|corporate,modern|0a2540-1a4b8c-635bff-80e9ff-f6f9fc
Golden Hour|warm,soft|33261d-8c5e3c-d9a066-f2d0a4-fff3e0
Emerald City|bold,natural|003b36-006d5b-00a878-80ed99-f2fdf4
Burgundy Wine|elegant,dark|2d0b13-5c0f1f-8e1c2f-c9a227-f4ecd6
Sky Kite|bright,cool|003049-0081a7-00afb9-fdfcdc-fed9b7
Stone Temple|minimal,earthy|3c3633-6b625b-a59e93-d5cfc3-f3efe7
Jungle Canopy|natural,dark|081c15-1b4332-2d6a4f-40916c-95d5b2
Candy Shop|playful,bright|ff006e-ff7aa2-ffd60a-3a86ff-8338ec
Fog Harbour|calm,mono|2f3640-525e6b-8395a7-c8d3df-eef2f6
Paprika|warm,bold|231f20-bb4430-7ebdc2-f3dfa2-efe6dd
Aquamarine Dream|cool,fresh|006466-065a60-0b525b-144552-4d908e-90e0ef
Retro Diner|retro,bold|1f1f1f-d62828-f77f00-fcbf49-eae2b7
Hygge Living|calm,warm|3e3a37-807468-c3b299-e9dfcf-faf6f0
Ocean Sunset|coastal,warm|001219-005f73-0a9396-94d2bd-e9d8a6-ee9b00-ca6702-bb3e03
Plum Orchard|elegant,soft|3c1a3c-6b2d5c-a4508b-e0a3c8-f9e3ef
Copper Kettle|warm,industrial|2a1d16-6e3b24-b76e3a-e3a46b-f5e1c8
Soft Linen|minimal,soft|5b5550-a39b8b-d6cfc4-ece6dc-fbf8f3
Digital Lime|neon,modern|0f0f0f-1c1c1c-c6ff00-e9ff70-ffffff
Mediterranean|coastal,summer|0b3954-087e8b-bfd7ea-ff5a5f-c81d25
Bamboo Spa|calm,natural|283d3b-197278-edddd4-c44536-772e25
Iris Garden|spring,cool|23185b-4b3f9e-7d73c3-b9b3e6-ece9fb
Burnt Sienna|earthy,autumn|3b1f12-8a3b12-c4662f-e8a765-f7dfbd
Cloud Nine|pastel,cool|cddafd-dfe7fd-f0efeb-fad2e1-bee1e6
Night Market|dark,bold|14080e-49475b-799496-acc196-e9eb9e
Vanilla Sky|soft,warm|fff8e7-fde8c8-f9c784-e7a977-6b4e3d
Teal Tavern|cool,dark|04151f-183a37-efd6ac-c44900-432534
Strawberry Milk|pastel,playful|ffe5ec-ffc2d1-ffb3c6-ff8fab-fb6f92
Concrete Jungle|industrial,mono|212529-495057-adb5bd-dee2e6-f8f9fa
Persimmon|warm,bold|3d1308-7b0d1e-9f2042-f8e5ee-e85d04
Alpine Lake|cool,natural|1a3c40-1d5c63-417d7a-a6c7c5-ede6db
Neon Tokyo|neon,bold|120136-03256c-2541b2-1768ac-06bee1-ff2e63
Wheat Field|earthy,soft|5e503f-a9927d-d4c1a2-ece2d0-f9f5ee
Ruby Lounge|dark,elegant|1b0a10-4a0d1f-8f1d3a-d1495b-edae49
Baltic Sea|cool,calm|1b263b-264653-3d5a80-98c1d9-e0fbfc
Mango Tango|summer,bright|ff7b00-ff8800-ff9500-ffa200-ffb700-ffd000
Botanical Print|natural,elegant|132a13-31572c-4f772d-90a955-ecf39e
Porcelain|minimal,cool|1e2a38-3b5068-a0b5c9-e3ebf3-ffffff
Sangria|bold,warm|370617-6a040f-9d0208-d00000-dc2f02-e85d04-faa307
Seafoam|pastel,coastal|006d77-83c5be-edf6f9-ffddd2-e29578
Ash & Ember|dark,warm|1a1a1a-2e2e2e-ff4d00-ff9e00-f5f5f5
Morning Coffee|coffee,soft|3b2a20-6d4c3d-a1887f-d7c4b7-f5ede6
Galaxy Quest|dark,cool|0b0033-370031-832232-ce8964-eaf27c
Spring Picnic|spring,playful|ef476f-ffd166-06d6a0-118ab2-073b4c
Mauve Morning|soft,elegant|52414c-856e7d-b99aa6-dcc5cf-f5ecf0
Kraft Paper|earthy,minimal|3d3028-8b6f4e-c2a37c-e6d5b8-f7f0e3
Tangerine Dream|warm,playful|2b2d42-ef8354-ee4b6a-df3b57-0f7173
Evergreen Corp|corporate,natural|0b2e2a-11574a-2f8f6f-a6d5c2-f2faf7
Opal|pastel,cool|e0fbfc-c2dfe3-9db4c0-5c6b73-253237
Volcano|bold,dark|03071e-370617-6a040f-9d0208-dc2f02-f48c06-ffba08
Dusty Rose|soft,wedding|5d3a3a-a26769-d5b9b2-ece2d0-faf7f2
Cobalt & Cream|bold,modern|0047ab-2a6fdb-f3e9d2-f6bd60-1e1e24
Lichen|natural,calm|4a4e3a-707a52-a9b388-d8dcc0-f3f4ea
Pop Art|playful,bold|000000-ffffff-ffde00-ff1f5a-1ea0ff
Silver Screen|mono,elegant|0e0e10-2b2b30-56565e-a9a9b2-ececf0
Papaya Whip|warm,pastel|fff1e6-fde2e4-fad2e1-e2ece9-bee1e6
Cedar Lodge|warm,natural|2c1a12-5b3a29-8b5e3c-c8a27c-e8dccb
Hydrangea|cool,soft|2b2d5b-4b4f9b-8b8fd1-c2c5f2-eef0ff
Sunflower|summer,bright|283618-606c38-fefae0-dda15e-bc6c25
Arcade|neon,retro|1b1b3a-693668-a74482-f84aa7-ff3562
Coastal Grey|minimal,coastal|33415c-5c6b80-98a6b5-cfd8e0-f4f7f9
Marigold|warm,autumn|432818-99582a-bb9457-ffe6a7-6f1d1b
Frozen Berry|winter,cool|2b193d-5c3d78-a782c3-dcc6e0-f4eff7
Avocado Toast|natural,playful|3f4e2a-6a8532-a7c957-f2e8cf-bc4749
Steel Mill|industrial,cool|16191d-2c3e50-5d6d7e-aab7b8-ecf0f1
Hibiscus|tropical,bold|58111a-95190c-e34a27-f6a15f-fde4cf
Calm Clinic|corporate,calm|0b3c49-2b7a78-8fc1b5-dceeea-f7fbfa
Tuscan Villa|earthy,warm|4b3832-854442-be9b7b-fff4e6-3c2f2f
Parchment|soft,minimal|403d39-7c766d-ccc5b9-eae4d8-fffcf2
Raspberry Ripple|playful,bold|590d22-800f2f-a4133c-c9184a-ff4d6d-ff758f-ffb3c1
Blue Hour|cool,calm|0d1321-1d2d44-3e5c76-748cab-f0ebd8
Tea Ceremony|natural,calm|39402e-6b705c-a5a58d-b7b7a4-ffe8d6
Sorbet Stack|pastel,summer|ffadad-ffd6a5-fdffb6-caffbf-9bf6ff-a0c4ff-bdb2ff-ffc6ff
Gotham|dark,mono|0b0b0c-1a1a1d-4e4e50-6f2232-950740
Riviera|coastal,bright|03256c-2541b2-1768ac-06bee1-ffffff
Spiced Chai|warm,coffee|3c2a21-6f4d38-b07d62-e6c3a1-f6ece1
Moonstone|cool,mono|1e2229-3a3f4a-6d7684-b8c0cc-eef1f5
Fiesta|bright,playful|e63946-f1c453-2a9d8f-264653-f4a261
Heather Moor|natural,soft|3e3546-6b5b78-a69cac-d8d1dd-f4f1f6
Aurora Borealis|cool,bold|00c9a7-4d8076-845ec2-d65db1-ff6f91
Driftwood|coastal,earthy|4f4a45-8e8378-c2b8aa-e3ddd3-f7f4ef
Hot Sauce|bold,warm|1a0000-660000-b20000-ff2400-ff9100
Pastel Dream|pastel,soft|cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff
Indigo Ink|dark,cool|0b0a33-1b1a5e-3a37a6-8d8ae0-e5e4fb
Grapefruit|summer,warm|ffe5d9-ffcad4-f4acb7-9d8189-d8e2dc
Workspace|corporate,minimal|111827-374151-6366f1-a5b4fc-f9fafb
Cotton Candy|pastel,playful|f8edeb-fec5bb-fcd5ce-e8e8e4-d8e2dc-ece4db
Juniper|natural,cool|1d3b36-35635b-6a9c89-c4dfdf-f8f6f0
Brick Lane|industrial,warm|2d2a32-5e3023-8e443d-cb9173-f0e0d0
Bluebird|bright,cool|03045e-0077b6-00b4d8-90e0ef-caf0f8
Desert Night|dark,earthy|1b1717-3c2a21-7b4b2a-c08552-f2d0a4
Pistachio|pastel,natural|3d4f2f-6f8a4c-a7c58a-d8e9c3-f5faef
Velvet Theatre|elegant,dark|10002b-240046-3c096c-5a189a-ff9e00
Sandcastle|summer,soft|3d405b-81b29a-f2cc8f-f4f1de-e07a5f
Thunderstorm|dark,cool|0b090a-161a1d-660708-a4161a-d3d3d3
Peony|spring,soft|7b2d26-d9777d-f4b9b8-fae0df-fffaf9
Cool Mint|fresh,cool|004643-0c7c59-4ecdc4-c7f9f3-f9fffe
Gold Leaf|elegant,warm|1c1c1c-4a3f35-b08d57-e5c890-f8f1e5
Sapphire|bold,cool|001845-002855-023e7d-0353a4-33a1fd
Garden Party|spring,playful|e9ff70-ffd670-ff9770-ff70a6-70d6ff
Woodland|autumn,natural|1e1a14-4a3b2a-7a6243-b29b6e-dcd2b8
Arctic Fox|winter,minimal|364958-55828b-87bba2-c9e4ca-f6fff8
Neon Sign|neon,dark|000000-14213d-fca311-e5e5e5-ffffff
Saltwater Taffy|pastel,playful|f2b5d4-f7d6e0-eff7f6-b2f7ef-7bdff2
Charcoal Studio|minimal,dark|0d0d0d-262626-404040-737373-e5e5e5
Pomegranate|bold,warm|3c0008-6f0d19-a4161a-e5383b-f5cac3
Starlight|dark,elegant|0a0908-22333b-eae0d5-c6ac8f-5e503f
Rainforest|natural,bold|004b23-006400-007200-38b000-9ef01a-ccff33
Ice Cream Parlour|pastel,retro|fbf8cc-fde4cf-ffcfd2-f1c0e8-cfbaf0-a3c4f3-90dbf4-8eecf5
Merlot|dark,warm|2b0a0a-5c1a1b-8c2f39-b9375e-ffccd5
Fresh Linen|minimal,cool|2b2d42-8d99ae-edf2f4-ffffff-ef233c
Saharan|desert,warm|7f5539-a68a64-b6ad90-c2c5aa-a4ac86
Kingfisher|bold,cool|0b132b-1c2541-3a506b-5bc0be-ffffff
Apricot Jam|warm,playful|370617-f4845f-f79d65-f7b267-ffe5b4
Hazelnut|coffee,earthy|2e1f17-5c4033-8c6a54-c4a484-ece0d1
Lagoon Teal|cool,fresh|003d5b-30638e-00798c-d1495b-edae49
Snowdrop|winter,soft|e9ecef-dee2e6-ced4da-adb5bd-6c757d-343a40
Chili & Lime|bold,playful|1b1b1b-d00000-ffba08-3f88c5-136f63
Orchid|elegant,soft|3d0e3a-7a1e6b-c05299-eaa7d0-fbe6f3
Tundra|cool,natural|2d3a3a-4f6d6d-8fa7a3-c9d6cf-f1f4f0
Bold Startup|modern,bold|0a0a0a-5b21b6-a855f7-fde047-ffffff
Rosé|wedding,soft|7a4d4b-c38d8a-ebc5c0-f7e4e1-fff8f6
Mustard Seed|retro,warm|2f2f2f-6b705c-cb997e-ddbea9-ffe8d6
Seaweed|natural,coastal|081c15-1b4332-2d6a4f-52b788-b7e4c7-d8f3dc
Petrol|dark,industrial|0c1618-004643-1e5f74-faf4d3-d1ac00
Caramel Latte|coffee,warm|4b2e1e-8b5a3c-c58b5b-e9c49a-f7ead9
Electric Blue|neon,cool|000814-001d3d-003566-ffc300-ffd60a
Hummingbird|bright,playful|2b9348-55a630-80b918-ffd60a-ff6d00-d00000
Wisteria|pastel,spring|3d2b56-6e5a8a-a491c4-cdbfe3-f1ecf8
Bistro|warm,elegant|1e1a17-48302a-8c4b3e-d9a26b-f2e3c9
Glass House|cool,minimal|0f1e2b-1f4e5f-7fb7be-d3f3ee-ffffff
Mulberry|dark,bold|2b0b2e-5a1a5e-8f2d8f-d65db1-ffc6ff
Atlantic|coastal,cool|00171f-003459-007ea7-00a8e8-ffffff
Toffee Apple|autumn,bold|3a1c14-7b2d26-c1440e-f2a541-f7e7ce
Midnight Garden|dark,natural|0b1d1b-163832-2b5f4f-9bbf9b-f0e6c8
Soft Clay|earthy,soft|6b4f43-a47e6b-d8b4a0-efd9cc-faf2ec
Cosmic Latte|soft,minimal|fff8e7-f2e8cf-d6ccc2-a39b8b-5e548e
Fjord|cool,calm|0a2239-53a2be-1d84b5-176087-132e32
Lollipop|playful,bright|ff0a54-ff477e-ff5c8a-ff7096-ff85a1-ff99ac-fbb1bd
Granola|earthy,warm|3f2e1e-7e5a3c-b8875c-e5c39a-f8eedd
Kyoto Garden|calm,natural|1b2a1f-3e5641-a24936-d36135-e8d6cb
Arctic Sun|cool,bright|003049-d62828-f77f00-fcbf49-eae2b7
Pale Blush|pastel,wedding|fff0f3-ffccd5-ffb3c1-ff8fa3-c9184a
Obsidian|dark,mono|050505-111111-1f1f1f-3d3d3d-8c8c8c
Meadow Lark|spring,natural|386641-6a994e-a7c957-f2e8cf-bc4749
Harvest Moon|autumn,dark|1b1a17-3e2c23-a35638-e6a15a-f4d9b0
Seashell|soft,coastal|f8f4e3-f1e3d3-e5c3a8-c69c80-806152
Laser Lemon|neon,bright|1a1a2e-16213e-0f3460-e94560-f9f871
Baby Blue|pastel,cool|e3f2fd-bbdefb-90caf9-64b5f6-1e88e5
Chocolate Box|warm,dark|1c0c05-3d1e0f-6b3a1f-a0673f-e3c49a
Verdigris|cool,natural|1f3a3d-2f6b6a-43aa8b-b2e4d5-f2f9f7
Cool Cucumber|fresh,natural|2b4c3f-4f7c5e-90b494-d4e7c5-f4faf0
Amethyst|elegant,cool|1d0c2e-3b1f5e-6a3fa0-a98bd9-e9defa
Linen & Sage|soft,natural|596157-8a9a83-b9c4b0-e6e9df-faf8f2
Firecracker|bold,bright|03071e-6a040f-d00000-ffba08-ffffff
Overcast|mono,cool|3d4451-6a7385-9aa3b5-c9d0dc-f0f3f7
Spring Onion|fresh,spring|1b4332-2d6a4f-74c69d-d8f3dc-fefae0
Smoked Salmon|warm,soft|4a2e2a-a35c4f-e49b85-f3c9b8-fdf0ea
Lapis|bold,cool|102542-1f3d7a-2f5fb3-f87060-cdd7d6
Old Library|dark,warm|1c1410-3b2a1e-6e4e37-b08b62-e8dac1
Glow Stick|neon,playful|0b0b0b-39ff14-ff073a-00f0ff-fdfd96
Beach Hut|summer,coastal|0081a7-00afb9-fdfcdc-fed9b7-f07167
Fog & Rust|industrial,calm|3a3a3a-6c6c6c-b5b5b5-e2e2e2-b7410e
`

export type CuratedPalette = { id: string; name: string; tags: string[]; colors: string[] }

export const CURATED: CuratedPalette[] = RAW.trim()
  .split('\n')
  .map((line, i) => {
    const [name, tags, hexes] = line.split('|')
    return {
      id: `c${i}`,
      name,
      tags: tags.split(',').map((t) => t.trim()),
      colors: hexes.split('-').map((h) => `#${h.toLowerCase()}`),
    }
  })
