import { address, generateKeyPairSigner } from '@solana/kit'
import {
	TOKEN_2022_PROGRAM_ADDRESS,
	getCreateAssociatedTokenIdempotentInstructionAsync,
	getInitializeMintInstruction,
	getMintSize,
	getMintToInstruction,
	findAssociatedTokenPda,
} from '@solana-program/token-2022'
import { getCreateAccountInstruction } from '@solana-program/system'
import { rpc, getFunder, ensureSol, sendInstructions, readEnv, writeEnv } from './lib.js'

const USDC_DECIMALS = 6

async function ensureMint(funder) {
	const env = readEnv()
	if (env.SEED_USDC_MINT) {
		console.log(`Reusing existing mock-USDC mint: ${env.SEED_USDC_MINT}`)
		return address(env.SEED_USDC_MINT)
	}

	const mint = await generateKeyPairSigner()
	const space = BigInt(getMintSize())
	const rent = await rpc.getMinimumBalanceForRentExemption(space).send()

	const createAccountIx = getCreateAccountInstruction({
		payer: funder,
		newAccount: mint,
		lamports: rent,
		space,
		programAddress: TOKEN_2022_PROGRAM_ADDRESS,
	})
	const initMintIx = getInitializeMintInstruction({
		mint: mint.address,
		decimals: USDC_DECIMALS,
		mintAuthority: funder.address,
		freezeAuthority: null,
	})

	const sig = await sendInstructions(funder, [createAccountIx, initMintIx])
	writeEnv('SEED_USDC_MINT', mint.address)
	console.log(`Created mock-USDC mint: ${mint.address}`)
	console.log(`  tx: ${sig}`)
	return mint.address
}

async function mintTo(funder, mint, owner, uiAmount) {
	const amount = BigInt(Math.round(uiAmount * 10 ** USDC_DECIMALS))
	const [ata] = await findAssociatedTokenPda({
		mint,
		owner,
		tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
	})
	const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: funder,
		mint,
		owner,
		tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
	})
	const mintToIx = getMintToInstruction({
		mint,
		token: ata,
		mintAuthority: funder,
		amount,
	})
	const sig = await sendInstructions(funder, [createAtaIx, mintToIx])
	console.log(`Minted ${uiAmount} mock-USDC to ${owner}`)
	console.log(`  ata: ${ata}`)
	console.log(`  tx:  ${sig}`)
}

async function makeKids(count) {
	const kids = []
	for (let i = 0; i < count; i++) {
		const kid = await generateKeyPairSigner()
		await ensureSol(kid.address, 0.2, 0.5)
		kids.push(kid)
		console.log(`Kid ${i + 1}: ${kid.address}`)
	}
	return kids
}

async function main() {
	const args = process.argv.slice(2)
	const parentArg = args.find(a => !a.startsWith('--'))
	const usdcAmount = Number(args[args.indexOf(parentArg) + 1]) || 1000
	const kidsCount = args.includes('--kids') ? 2 : 0

	const funder = await getFunder()
	console.log(`Funder: ${funder.address}`)
	await ensureSol(funder.address, 0.05, 1)

	const mint = await ensureMint(funder)

	if (parentArg) {
		const parent = address(parentArg)
		console.log(`\nFunding parent ${parent} …`)
		await ensureSol(parent, 0.2, 0.5)
		await mintTo(funder, mint, parent, usdcAmount)
	}

	if (kidsCount) {
		console.log(`\nCreating ${kidsCount} demo kids …`)
		await makeKids(kidsCount)
	}

	console.log(`\nDone. Set MOCK_USDC_MINT in src/scripts/lib/config.js to:\n  ${mint}`)
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
