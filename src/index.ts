import prompts from "prompts"
import ora from "ora"
import { Client, GatewayIntentBits } from "discord.js"
import { User } from "discord.js"

const SPACE = " ".repeat(4)

console.log(
	"Welcome to the Discord Suspicious Bot Growth Early Warning Detector (a mouthful, I know)!"
)
console.log("https://github.com/net-tech/discord-sus-growth-early-warning")
;(async () => {
	const response = await prompts(
		{
			type: "password",
			name: "token",
			message:
				"Please enter your bot's token, if you don't trust the code, see for yourself at the link above:",
		},
		{
			onCancel: () => {
				process.exit(0)
			},
		}
	)

	const spinner = ora("Starting client").start()

	let client: Client
	try {
		client = new Client({
			intents: [GatewayIntentBits.Guilds],
		})
		await client.login(response.token)
	} catch (error) {
		spinner.fail(`Failed to start client. ${error}`)
		process.exit(1)
	}

	if (!client) return

	client.on("ready", async () => {
		spinner.text = "Getting guilds"

		await client.guilds.fetch()
		const guilds = client.guilds.cache

		if (guilds.size > 100) {
			spinner.fail(
				`You are in ${guilds.size} guilds, which is over the 100 limit for non-verified bots. Why are you using this tool if you're already verified?`
			)
			process.exit(0)
		}

		spinner.text = "Analyzing guilds"

		const messages: Message[] = []

		const botOwnerId =
			client.application?.owner instanceof User
				? client.application.owner.id
				: null

		const over50PercentBots = guilds.filter(
			(guild) =>
				guild.members.cache.filter((member) => member.user.bot).size /
					guild.members.cache.size >
				0.5
		)

		if (over50PercentBots.size > 0) {
			messages.push({
				type: "warn",
				message: `Your bot is in ${
					over50PercentBots.size
				} guilds where over 50% of the members are bots.\n${SPACE}└ ${over50PercentBots
					.map((guild) => guild.name)
					.join(`\n${SPACE}└ `)}`,
			})
		}

		const guildsOwners = guilds.map((guild) => guild.ownerId)
		const guildsWithSameOwners = guilds.filter((guild) =>
			guildsOwners.filter((id) => id === guild.ownerId).length > 1 && botOwnerId
				? botOwnerId !== guild.ownerId
				: true
		)

		if (guildsWithSameOwners.size > 0 && guildsWithSameOwners.size < 5) {
			messages.push({
				type: "warn",
				message: `There are ${
					guildsWithSameOwners.size
				} guilds that are owned by the same user or set of users.\n${SPACE}└ ${guildsWithSameOwners
					.map((guild) => guild.name)
					.join(`\n${SPACE}└ `)}`,
			})
		}

		if (guildsWithSameOwners.size > 5) {
			messages.push({
				type: "danger",
				message: `There are ${
					guildsWithSameOwners.size
				} guilds that are owned by the same user or set of users.\n${SPACE}└ ${guildsWithSameOwners
					.map((guild) => guild.name)
					.join(`\n${SPACE}└ `)}`,
			})
		}

		const guildsOwnedByBotOwner = guilds.filter(
			(guild) => guild.ownerId === botOwnerId
		)

		if (guildsOwnedByBotOwner.size > 0) {
			messages.push({
				type: "danger",
				message: `There are ${
					guildsOwnedByBotOwner.size
				} guilds that are owned by the bot owner.\n${SPACE}└ ${guildsOwnedByBotOwner
					.map((guild) => guild.name)
					.join(`\n${SPACE}└ `)}`,
			})
		}

		const guildsWithLessThan10Members = guilds.filter(
			(guild) => guild.memberCount < 10
		)

		if (guildsWithLessThan10Members.size > 0) {
			messages.push({
				type: "warn",
				message: `There are ${
					guildsWithLessThan10Members.size
				} guilds with less than 10 members.\n${SPACE}└ ${guildsWithLessThan10Members
					.map((guild) => guild.name)
					.join(`\n${SPACE}└ `)}`,
			})
		}

		const messagesFormatted = messages.map((message) => {
			switch (message.type) {
				case "warn":
					return `❗ ${message.message}`
				case "danger":
					return `🛑 ${message.message}`
			}
		})

		spinner.stopAndPersist({
			symbol: messages.length === 0 ? "✔" : "❗",
			text: `Analysis complete. Found ${
				messages.length
			} potential issues\n${messagesFormatted.join("\n")}${
				messages.length === 0
					? "Please note that this does NOT guarantee anything."
					: ""
			}`,
		})

		process.exit(0)
	})
})()

interface Message {
	type: "warn" | "danger"
	message: string
}
