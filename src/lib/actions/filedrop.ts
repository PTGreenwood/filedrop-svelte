import type { Events } from "../event";
import { getFilesFromEvent, extractFilesFromEvent, isEventWithFiles, isNode } from "../event";
import type { FileDropOptions } from "../options";
import { userAgent } from "../useragent";

type Action = {
	destroy(): void;
	update(options?: FileDropOptions);
};

export const filedrop = function (node: HTMLElement, options?: FileDropOptions): Action {
	function dispatch<K extends keyof Events, T extends Events[K] = Events[K]>(typ: K, detail: T): void {
		node.dispatchEvent(
			new CustomEvent<T>(typ, { detail }),
		);
	}
	options = options || {};

	let windowDrop = options.windowDrop === undefined || options.windowDrop;
	let isFileDialogOpen = false;
	let isDraggingFiles = false;

	const input = getInputElement(node, options);
	node.tabIndex = getTabIndex(node, input);
	input.style.display = "none";
	input.tabIndex = -1;

	if (options.multiple) {
		input.multiple = true;
	}

	let triggerEvent: Event;

	async function handleChange(ev: Event) {
		ev.preventDefault();
		const files = await getFilesFromEvent(ev, options);
		dispatch("filedrop", {
			method: "input",
			files,
			isFileDialogOpen,
			isDraggingFiles,
			event: triggerEvent,
			id: options.id,
			options,
		});
	}

	async function handleDrop(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		ev.preventDefault();
		triggerEvent = ev;
		const files = await getFilesFromEvent(ev, options);
		dispatch("filedrop", {
			method: "drop",
			files,
			options,
			id: options.id,
			isFileDialogOpen,
			isDraggingFiles,
			event: triggerEvent,
		});
	}

	function openDialog() {
		if (userAgent.isIE() || userAgent.isLegacyEdge()) {
			setTimeout(input.click, 1);
		} else {
			input.click();
		}
	}

	function handleKeyDown(ev: KeyboardEvent) {
		triggerEvent = ev;
		if (ev.key === " " || ev.key === "Enter") {
			ev.preventDefault();
			openDialog();
		}
	}

	function handleInputClick(ev: Event) {
		ev.stopPropagation();
		isFileDialogOpen = true;
		dispatch("filedialogopen", {
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	function handleClick(ev: Event) {
		triggerEvent = ev;
		openDialog();
	}
	function handleDocumentDragEnter(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
	}
	async function handleDocumentDragLeave(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		isDraggingFiles = false;
		const files = await extractFilesFromEvent(ev);
		dispatch("windowfiledragleave", {
			event: ev,
			files,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	async function handleDocumentDragOver(ev: DragEvent) {
		ev.preventDefault();
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		const files = await extractFilesFromEvent(ev);
		dispatch("windowfiledragover", {
			event: ev,
			files,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	async function handleDragEnter(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		isDraggingFiles = true;
		const files = await extractFilesFromEvent(ev);
		dispatch("filedragenter", {
			files,
			event: ev,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	async function handleDragLeave(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		const files = await extractFilesFromEvent(ev);
		dispatch("filedragleave", {
			event: ev,
			files,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}
	async function handleDragOver(ev: DragEvent) {
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		const files = await extractFilesFromEvent(ev);
		dispatch("filedragover", {
			event: ev,
			files,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	async function handleDocumentDrop(ev: DragEvent) {
		ev.preventDefault();
		isDraggingFiles = isEventWithFiles(ev);
		if (!isDraggingFiles) {
			return;
		}
		if (isNode(ev.currentTarget) && (node.isEqualNode(ev.currentTarget) || node.contains(ev.currentTarget))) {
			// let it bubble
			return;
		}
		if (!windowDrop) {
			return;
		}
		const files = await getFilesFromEvent(ev, options);
		dispatch("filedrop", {
			method: "drop",
			event: ev,
			files,
			isDraggingFiles,
			isFileDialogOpen,
			id: options.id,
			options,
		});
	}

	function handleWindowFocus() {
		if (input && isFileDialogOpen) {
			isFileDialogOpen = false;
			const tick = (t: number) => {
				return () => {
					if (!input?.files.length && t < 21) {
						setTimeout(tick(t + 1), 35);
					} else if (!input.files.length) {
						dispatch("filedialogcancel", {
							isDraggingFiles,
							isFileDialogOpen,
							id: options.id,
							options,
						});
					} else {
						dispatch("filedialogclose", {
							isDraggingFiles,
							isFileDialogOpen,
							id: options.id,
							options,
						});
					}
				};
			};
			setTimeout(tick(0), 35);
		}
	}

	function init(options: FileDropOptions) {
		if (options.fileLimit === 1) {
			options.multiple = false;
		}
		if (options.fileLimit === 0) {
			options.disabled = true;
		}
		if (options.fileLimit == undefined || options.fileLimit > 1) {
			options.multiple = true;
		}
		if ((options.multiple === undefined && options.fileLimit > 1) || options.fileLimit === undefined) {
			options.multiple = true;
		}

		if (!options.disabled) {
			windowDrop = options.windowDrop === undefined || options.windowDrop;
			node.classList.remove("disabled");
			input.multiple = options.multiple;
			if (options.accept?.length) {
				if (Array.isArray(options.accept)) {
					input.accept = options.accept.join(",");
				} else {
					input.accept = options.accept;
				}
			}
			input.autocomplete = "off";
			node.addEventListener("keydown", handleKeyDown);
			node.addEventListener("dragenter", handleDragEnter);
			node.addEventListener("dragleave", handleDragLeave);
			node.addEventListener("dragover", handleDragOver);
			node.addEventListener("drop", handleDrop);
			input.addEventListener("change", handleChange);
			input.addEventListener("click", handleInputClick);

			document.addEventListener("dragenter", handleDocumentDragEnter);
			document.addEventListener("dragleave", handleDocumentDragLeave);
			document.addEventListener("dragover", handleDocumentDragOver);
			document.addEventListener("drop", handleDocumentDrop);
			if (options.clickToUpload === undefined || options.clickToUpload) {
				node.addEventListener("click", handleClick);
			} else {
				node.removeEventListener("click", handleClick);
			}
			if (!userAgent.isServer()) {
				window.addEventListener("focus", handleWindowFocus);
			}
		} else {
			node.classList.add("disabled");
			teardown();
		}
	}
	function teardown() {
		node.removeEventListener("keydown", handleKeyDown);
		node.removeEventListener("dragenter", handleDragEnter);
		node.removeEventListener("dragleave", handleDragLeave);
		node.removeEventListener("dragover", handleDragOver);
		node.removeEventListener("drop", handleDrop);
		node.removeEventListener("click", handleClick);
		input.removeEventListener("change", handleChange);
		input.removeEventListener("click", handleInputClick);
		input.files = null;
		if (!userAgent.isServer()) {
			document.removeEventListener("dragover", handleDocumentDragOver);
			document.removeEventListener("dragenter", handleDocumentDragEnter);
			document.removeEventListener("dragleave", handleDocumentDragLeave);
			document.removeEventListener("drop", handleDocumentDrop);
			window.removeEventListener("focus", handleWindowFocus);
		}
	}

	init(options || {});

	return {
		update(options?: FileDropOptions) {
			init(options || {});
		},
		destroy() {
			teardown();
		},
	};
};

function isFileInput(node: HTMLElement): node is HTMLInputElement {
	return node.tagName === "INPUT" && node.getAttribute("type")?.toLowerCase() === "file";
}

function getInputElement(node: HTMLElement, { input }: FileDropOptions): HTMLInputElement {
	if (input != undefined) {
		if (isFileInput(input)) {
			return input;
		}
		throw new Error("input must be an HTMLInputElement with type file");
	}
	if (node.tagName === "INPUT") {
		throw new Error("FileDrop: action must be used on a containing element, not the input.");
	}
	const inputs = node.querySelectorAll("input[type='file']");
	if (!inputs.length) {
		const input = document.createElement("input");
		input.setAttribute("type", "file");
		input.style.display = "none";
		input.tabIndex = -1;
		return node.appendChild(input);
	}
	if (inputs.length > 1) {
		throw new Error(
			"FileDrop: container node may only contain a single file input unless input is specified in the options",
		);
	}
	return inputs.item(0) as HTMLInputElement;
}

function getTabIndex(node: HTMLElement, input: HTMLInputElement): number {
	if (node.tabIndex > -1) {
		return node.tabIndex;
	}
	if (input.tabIndex > -1) {
		return input.tabIndex;
	}
	return 0;
}

export default filedrop;
