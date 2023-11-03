import axios from "axios"

export default class RegistrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")

        this.insertValidationElements()
        
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.username.isUnique = false

        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.email.isUnique = false

        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""

        this.events()
    }

    // Events
    events() {
        this.form.addEventListener("submit", e => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener("keyup", () => this.isDifferent(this.username, this.usernameHandler))
        this.email.addEventListener("keyup", () => this.isDifferent(this.email, this.emailHandler))
        this.password.addEventListener("keyup", () => this.isDifferent(this.password, this.passwordHandler))

        this.username.addEventListener("blur", () => this.isDifferent(this.username, this.usernameHandler))
        this.email.addEventListener("blur", () => this.isDifferent(this.email, this.emailHandler))
        this.password.addEventListener("blur", () => this.isDifferent(this.password, this.passwordHandler))
    }

    // Methods
    isDifferent(elmnt, handler) {
        if (elmnt.previousValue != elmnt.value) {
            handler.call(this)
        }
        elmnt.previousValue = elmnt.value
    }

    formSubmitHandler() {
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if (
            this.username.isUnique &&
            !this.username.errors &&
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
        ) {
            this.form.submit()
        }

    }

    emailHandler() {
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(), 800)
    }
    
    passwordHandler() {
        this.password.errors = false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800)
    }

    usernameHandler() {
        this.username.errors = false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800)
    }

    passwordImmediately() {
        if (this.password.value.length > 50) {
            this.showValidationError(this.password, "Password can't be more than 30 characters!")
        }

        if (!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }

    usernameImmediately() {
        if (this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value) ) {
            this.showValidationError(this.username, "Username can only contain letters and numbers!")
        }

        if (this.username.value.length > 30) {
            this.showValidationError(this.username, "Username can't be more than 30 characters!")
        }

        if (!this.username.errors) {
            this.hideValidationError(this.username)
        }
    }

    showValidationError(el, msg) {
        el.nextElementSibling.innerHTML = msg
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors = true
    }

    hideValidationError(el) {
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
        el.errors = false
    }

    passwordAfterDelay() {
        if (this.password.value.length < 8) {
            this.showValidationError(this.password, "Password must be at least 8 characters! ")
        }
    }

    usernameAfterDelay() {
        if (this.username.value.length < 3) {
            this.showValidationError(this.username, "Username must be at least 3 characters!")
        }

        if (!this.username.errors) {
            axios.post('/doesUsernameExist', {
                username: this.username.value.toLowerCase(),
                _csrf: this._csrf
            })
            .then((response) => {
                if (response.data) {
                    this.showValidationError(this.username, "Username is already taken!")
                    this.username.isUnique = false
                } else {
                    this.username.isUnique = true
                }
            })
            .catch(() => {
                alert("please try again later")
            })
        }
    }

    emailAfterDelay() {
        if (!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, "Please enter a valid email.")
        }

        if (!this.email.errors) {
            axios.post('/doesEmailExist', {
                email: this.email.value,
                _csrf: this._csrf
            })
            .then((response) => {
                if (response.data) {
                    this.showValidationError(this.email, "Email is already taken!")
                    this.email.isUnique = false
                } else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            })
            .catch(() => {
                alert("please try again later")
            })
        }
    }

    insertValidationElements() {
        this.allFields.forEach(elmnt => {
            elmnt.insertAdjacentHTML("afterend", `
                <div class="alert alert-danger small liveValidateMessage"></div>
            `)
        })
    }
}