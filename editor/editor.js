// put together by hopes and dreams
const prev = document.querySelector(".preview iframe")
const input = document.querySelector("input.template")
const update = document.querySelector("button.update")
const exportPage = document.querySelector("button.export")

const els = document.querySelector(".element-list")
const panel = document.querySelector(".editable")

let template
let config = {}
let values = {}
var editing

exportPage.addEventListener("click",()=>{
    const blob = new Blob([render()], {
        type: "text/html"
    })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "website.html"
    a.click()
})

function parseCategory(category) {
    const result = {
        type: "category",
        children: {}
    }

    for (const child of category.querySelectorAll("[data-guhw-category]")) {
        if (child === category)
            continue

        const parentCategory = child.parentElement?.closest("[data-guhw-category]")

        if (parentCategory !== category)
            continue

        const name = child.getAttribute("data-guhw-category")

        result.children[name] = parseCategory(child)
    }

    for (const editable of category.querySelectorAll("[data-guhw-editable]")) {
        const owner = editable.closest("[data-guhw-category]")

        if (owner !== category)
            continue

        const name = editable.getAttribute("data-guhw-editable")

        result.children[name] = {
            default: editable.innerHTML,
            type: "text"
        }

        values[name] = {
            value: editable.innerHTML
        }
    }

    for (const opt of category.querySelectorAll("[data-guhw-group]")) {
        const owner = opt.closest("[data-guhw-category]")

        if (owner !== category)
            continue

        const group = opt.getAttribute("data-guhw-group")
        const value = opt.getAttribute("data-guhw-opt")

        if (!result.children[group]) {
            result.children[group] = {
                default: value,
                options: [],
                type: "options"
            }

            values[group] = {
                value
            }
        }

        result.children[group].options.push(value)
    }

    return result
}

function renderTree(node, parent, path = []) {
    for (const [name, data] of Object.entries(node.children)) {
        const currentPath = [...path, name]
        if (data.type === "category") {
            const cat = document.createElement("div")
            cat.classList.add("category")
            const title = document.createElement("h3")
            title.innerText = name

            cat.append(title)
            parent.append(cat)
            renderTree(data, cat, currentPath)
        } else {
            const btn = document.createElement("button")
            btn.innerText = name

            btn.addEventListener("click", () => {
                select(currentPath)
            })

            parent.append(btn)
        }
    }
}

function getByPath(path) {
    let current = config

    for (const part of path) {
        current = current.children[part]
    }

    return current
}

function select(path) {
    const item = getByPath(path)

    if (item.type === "category")
        return

    panel.querySelectorAll(".visible")
        .forEach(e => e.classList.remove("visible"))

    const prop = panel.querySelector(
        `#${item.type}-edit`
    )

    if (!prop)
        return

    prop.classList.add("visible")

    const key = path[path.length - 1]

    if (item.type === "text") {
        prop.value = values[key].value
    }

    if (item.type === "options") {
        prop.innerHTML = ""

        item.options.forEach(option => {
            const opt = document.createElement("option")
            opt.value = option
            opt.textContent = option

            if (option === values[key].value) {
                opt.selected = true
            }

            prop.append(opt)
        })
    }

    panel.querySelector(".selected").innerText = path.join("/").toUpperCase()
    editing = values[key]
}

input.addEventListener("input", async () => {
    const parser = new DOMParser()
    const text = await input.files[0].text()

    template = parser.parseFromString(text, "text/html")

    values = {}

    const root = template.querySelector(
        "[data-guhw-category]"
    )

    if (!root) {
        return alert("i don't think this is an editable website!")
    }

    config = parseCategory(root)

    els.innerHTML = ""

    renderTree(config, els)
})

function render() {
    const doc = template.cloneNode(true)

    doc.querySelectorAll("[data-guhw-editable]").forEach(el => {
        const key = el.getAttribute("data-guhw-editable")

        if (values[key]) {
            el.innerHTML = values[key].value
        }
    })

    const groups = {}

    doc.querySelectorAll("[data-guhw-group]").forEach(el => {
        const group = el.getAttribute("data-guhw-group")

        groups[group] ??= []
        groups[group].push(el)
    })

    for (const [group, elements] of Object.entries(groups)) {
        const selected = values[group]?.value

        elements.forEach(el => {
            if (el.getAttribute("data-guhw-opt") !== selected) {
                el.remove()
            }
        })
    }

    doc.querySelectorAll("*").forEach(el => {
        for (const attr of [...el.attributes]) {
            if (attr.name.startsWith("data-guhw-")) {
                el.removeAttribute(attr.name)
            }
        }
    })

    return doc.documentElement.outerHTML
}
update.addEventListener("click", () => {
    prev.srcdoc = render()
})

document.querySelectorAll(".prop").forEach(el=>{
    el.addEventListener("input",()=>{
        editing.value = el.value
    })
})