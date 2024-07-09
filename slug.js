function slugify(str) {
	return str.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
}

const figureName = "Goddess of Victory: Nikke - Alice - Figma #628 (Max Factory) [Shop Exclusive]";
const slug = slugify(figureName);
// console.log(slug);

const figures = [
	{
		name: "Fate/Grand Order - Saber Alter - 1/7 - Dress ver. (Alter)",
	},
	{
		name: "Evangelion Shin Gekijouban: Q - Souryuu Asuka Langley - 1/7 - Jersey ver. - Red Box Re-Release (Alter)",
	},
	{
		name: "Goddess of Victory: Nikke - Alice - Figma #628 (Max Factory) [Shop Exclusive]",
	},
	{
		name: "Oshi no Ko - Hoshino Ruby - Nendoroid #2537 - School Uniform Ver. (Good Smile Company)",
	},
	{
		name: "Dragon Knight Princess Colidis 1/7 Scale Figure",
	},
	{
		name: "Huggy Good Smile NieR: Automata Ver 1.1a 2B",
	},
	{
		name: "Fate/Grand Order Saber/Altria Pendragon (Alter) & Cuirassier Noir 1/8 Scale Figure (Re-run)",
	},
	{
		name: "Fate/stay night: Unlimited Blade Works Rin Tohsaka 1/7 Scale Figure",
	},
	{
		name: "Vocaloid - Hatsune Miku - 1/7 - 15th Anniversary Ver. (Good Smile Company)",
	},
	{
		name: "Fate/Grand Order - Scáthach - 1/7 - Lancer - 2024 Re-release (PLUM",
	},
	{
		name: "Goddess of Victory: Nikke - Alice - Tenitol (FuRyu)",
	},
	{
		name: "Goddess of Victory: Nikke - Guillotine - F:Nex - 1/7 (FuRyu)",
	},
	{
		name: "NieR:Automata Ver1.1a - Pod 042 - YoRHa No. 2 Type B - 1/7 - -Exploration- (Proof)",
	},
	{
		name: "NieR:Automata Ver1.1a - YoRHa No. 2 Type B - Pop Up Parade (Good Smile Company)",
	},
	{
		name: "Fate/Grand Order -Divine Realm of the Round Table: Camelot- Lion King 1/7 Scale Figure",
	},
	{
		name: "RADIO EVA Evangelion Mari Makinami Illustrious 1/7 Scale Figure (Re-run)",
	},
	{
		name: "RADIO EVA Evangelion Mari Makinami Illustrious Part 2 1/7 Scale Figure",
	},
	{
		name: "NANA Nana Osaki 1/8 Scale Figure",
	},
	{
		name: "Re:Zero -Starting Life in Another World- Rem: Aqua Orb Ver. 1/7 Scale Figure",
	},
	{
		name: "Re:Zero -Starting Life in Another World- Ram -Oiran Dochu- 1/7 Scale Figure",
	},
	{
		name: "ArtFX J Trigun Stampede Vash the Stampede",
	},
	{
		name: "Trigun: Badlands Rumble - Kuro-Neko - Vash the Stampede - ARTFX J - 1/8 - 2024 Re-release (Kotobukiya)",
	},
	{
		name: "Trigun: Badlands Rumble - Nicholas D. Wolfwood - ARTFX J - 1/8 - 2024 Re-release (Kotobukiya)",
	},
	{
		name: "Azur Lane - Baltimore - Finish Line Flagbearer Ver. - 1/7 (APEX)",
	},
	{
		name: "Pop Up Parade Trigun Stampede Vash the Stampede",
	},
	{
		name: "Arena of Valor Da Ji: Beyond the Time Ver. 1/7 Scale Figure",
	},
];

const processFigureNames = (figures) => {
	return figures.map((figure) => {
		return figure.name
			.toLowerCase() // Convert to lowercase
			.replace(/[^\w\s-]/g, "") // Remove special characters
			.replace(/\s+/g, "-") // Replace spaces with hyphens
			.replace(/-+/g, "-"); // Replace multiple hyphens with a single hyphen
	});
};

const processedNames = processFigureNames(figures);
console.log(processedNames);
