import {ref} from 'vue'

// Global dialog state
const dialogRef = ref(null)

// Set the dialog component reference
export function setDialogRef(ref) {
	dialogRef.value = ref
}

// Wait for dialog to be ready (max 2 seconds)
async function waitForDialog(maxWait = 2000) {
	if (dialogRef.value) return true

	const start = Date.now()
	while (!dialogRef.value && Date.now() - start < maxWait) {
		await new Promise(resolve => setTimeout(resolve, 50))
	}

	if (!dialogRef.value) {
		console.error('Dialog component not ready')
		return false
	}
	return true
}

// Dialog functions
export function useDialog() {
	const showAlert = async (messageOrOptions, title) => {
		const ready = await waitForDialog()
		if (!ready) return true

		if (typeof messageOrOptions === 'string') {
			return dialogRef.value.alert({message: messageOrOptions, title: title || 'Notice'})
		}
		return dialogRef.value.alert(messageOrOptions)
	}

	const showConfirm = async options => {
		const ready = await waitForDialog()
		if (!ready) return false

		return dialogRef.value.confirm(options)
	}

	const showPrompt = async options => {
		const ready = await waitForDialog()
		if (!ready) return {confirmed: false, value: null}

		return dialogRef.value.prompt(options)
	}

	const showSuccess = async (message, title) => {
		const ready = await waitForDialog()
		if (!ready) return true

		return dialogRef.value.success(message, title)
	}

	const showError = async (message, title) => {
		const ready = await waitForDialog()
		if (!ready) return true

		return dialogRef.value.error(message, title)
	}

	const showWarning = async (message, title) => {
		const ready = await waitForDialog()
		if (!ready) return true

		return dialogRef.value.warning(message, title)
	}

	return {
		alert: showAlert,
		confirm: showConfirm,
		prompt: showPrompt,
		success: showSuccess,
		error: showError,
		warning: showWarning
	}
}

// Export default instance for direct import
export default useDialog()
