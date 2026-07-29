/**
 * Generates the VAPID keypair used to sign web-push messages.
 * Run once: `npm run keys:vapid`, then paste into .env.local / Railway vars.
 *
 * Rotating these invalidates every existing subscription — both people would
 * have to re-enable notifications. Generate once and keep them.
 */
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
