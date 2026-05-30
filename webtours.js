import http from 'k6/http'
import {check,group} from 'k6'
import {parseHTML} from 'k6/html'
import {SharedArray} from 'k6/data'
import {Trend} from 'k6/metrics'

const BASE_URL = 'http://www.load-test.ru:1080'

const data = new SharedArray('get data json', function(){
    const file = JSON.parse(open('./users.json'))
    return file.users
})

let userSession = "NOT_FOUND"
let departCity
let arriveCity
let flight

export const options = {
    vus: 1,
    thresholds:{
        'http_req_duration{my_tag:API}': ['p(90) < 100'],

        http_req_duration: ['p(90) < 300'],
            http_req_failed: ['rate < 0.01']
    }
}


export default function() {
    startPage();
    loginWebtours(userSession);
    flightsReservations();
    selectFlight();
    reserveFlight();
    payment();
    homePage()
}

export function startPage(){

    let startResp1 = http.get(`${BASE_URL}/webtours/`)
        check(startResp1, {'successful start page':(startResp1) => startResp1.status === 200})

        let reqOpt = {headers: {"signOff": "true"}}

        let startResp2 = http.get(`${BASE_URL}/cgi-bin/welcome.pl`, reqOpt)
        check(startResp2, {'status code is 200 /cgi-bin/welcome.pl':(startResp2) => startResp2.status === 200})
    
        reqOpt = {headers:{"in": "home"}}

        let startResp3 = http.get(`${BASE_URL}/cgi-bin/nav.pl`, reqOpt)
        check(startResp3, {'status code is 200 startPage/cgi-bin/nav.pl':(startResp3) => startResp3.status === 200})
        
        const page = parseHTML(startResp3.body)
        userSession = page.find('input[name="userSession"]').attr("value")

}


export function loginWebtours(userSession){

        const random = Math.floor(Math.random() * data.length)

        let credentials = data[random]

        let reqOpt = {headers: {"Content-Type": "application/x-www-form-urlencoded"}}

        let payload = 
            `username=${encodeURIComponent(credentials.username)}` +
            `&password=${encodeURIComponent(credentials.password)}` +
            `&userSession=${encodeURIComponent(userSession)}` +
            `&login.x=30` +
            `&login.y=11` +
            `&JSFormSubmit=off`

        let login = http.post(`${BASE_URL}/cgi-bin/login.pl`, payload, reqOpt)
        check(login, {'successful login':(login) => login.body.includes('User password was correct')})

        reqOpt = {headers: {"page":"menu", "in":"home"}}

        let loginFeed1 = http.get(`${BASE_URL}/cgi-bin/nav.pl`, reqOpt)

        let loginFeed2 = http.get(`${BASE_URL}/cgi-bin/login.pl?intro=true`)
        check(loginFeed2, {'successful login page':(loginFeed2) => loginFeed2.body.includes('<blockquote>Welcome, <b>')})

}


export function flightsReservations(){

    let flightsWelcome = http.get(`${BASE_URL}/cgi-bin/welcome.pl?page=search`)
    check(flightsWelcome, {'successful flight welcome':(flightsWelcome) => flightsWelcome.body.includes('User has returned to the search page')})

    let reqOpt = {headers: {"page": "menu","in": "flights"}}

    let flightsNav = http.get(`${BASE_URL}/cgi-bin/nav.pl`, reqOpt)
    check(flightsNav, {'successful flight welcome':(flightsNav) => flightsNav.body.includes('Web Tours Navigation Bar')})

    let flightsReservations = http.get(`${BASE_URL}/cgi-bin/reservations.pl?page=welcome`)
    check(flightsReservations, {'successful flight welcome':(flightsReservations) => flightsReservations.body.includes('Flight Selections')})

    departCity = randomCity(flightsReservations.body, "depart")
    arriveCity = randomCity(flightsReservations.body, "arrive")

}


export function selectFlight(){
    
    let reqOpt = {headers: {"Content-Type": "application/x-www-form-urlencoded"}}

    let payload = 
        `depart=${encodeURIComponent(departCity)}` +
        `&arrive=${encodeURIComponent(arriveCity)}` +
        `&advanceDiscount=0` +
        `&departDate=${new Date().toLocaleDateString('en-US')}` +
        `&numPassengers=1` +
        `&seatPref=None` +
        `&seatType=Coach` +
        `&findFlights.x=36` +
        `&findFlights.y=8`
    
    let goToFindFlights = http.post(`${BASE_URL}/cgi-bin/reservations.pl`, payload, reqOpt)
    check(goToFindFlights, {'successful go to flights':(goToFindFlights) => goToFindFlights.body.includes('Flight departing from')})

    const page = parseHTML(goToFindFlights.body)
    
    const flightsList = page.find('input[name="outboundFlight"]').map(
        function (idx, el) {
            return el.attr("value");
        })

    const random = Math.floor(Math.random() * flightsList.length)

    flight = flightsList[random]

}


export function reserveFlight(){
    
    let reqOpt = {headers: {"Content-Type": "application/x-www-form-urlencoded"}}

    let payload = 
        `outboundFlight=${encodeURIComponent(flight)}` +
        `&advanceDiscount=0` +
        `&numPassengers=1` +
        `&seatPref=None` +
        `&seatType=Coach` +
        `&reserveFlights.x=37` +
        `&reserveFlights.y=6`
    
    let reserveFlight = http.post(`${BASE_URL}/cgi-bin/reservations.pl`, payload, reqOpt)
    check(reserveFlight, {'successful flight reservation':(reserveFlight) => reserveFlight.body.includes('Payment Details')})

}


export function payment(){
    
    let reqOpt = {headers: {"Content-Type": "application/x-www-form-urlencoded"}}

    let payload = 
        `outboundFlight=${encodeURIComponent(flight)}` +
        `&advanceDiscount=0` +
        `&numPassengers=1` +
        `&seatPref=None` +
        `&seatType=Coach` +
        `&buyFlights.x=37` +
        `&buyFlights.y=6` +
        `&firstName=Irina` +
        `&lastName=Arkhitskaya` +
        `&pass1=Irina Arkhitskaya` +
        `&JSFormSubmit=off`
    
    let payment = http.post(`${BASE_URL}/cgi-bin/reservations.pl`, payload, reqOpt)
    check(payment, {'successful flight reservation':(payment) => payment.body.includes('Reservation Made!')})

}


export function homePage(){
    
        let reqOpt = {headers: {"page": "menus"}}

        let homePage = http.get(`${BASE_URL}/cgi-bin/welcome.pl`, reqOpt)
        check(homePage, {'status code is 200 home/cgi-bin/welcome.pl':(homePage) => homePage.status === 200})

        let loginFeed2 = http.get(`${BASE_URL}/cgi-bin/login.pl?intro=true`)
        check(loginFeed2, {'successful login home page':(loginFeed2) => loginFeed2.body.includes('Welcome, ')})
    
        reqOpt = {headers:{"page": "menus","in": "home"}}

        let startResp3 = http.get(`${BASE_URL}/cgi-bin/nav.pl`, reqOpt)
        check(startResp3, {'status code is 200 home/startPage/cgi-bin/nav.pl':(startResp3) => startResp3.status === 200})

}


export function randomCity(body, flightDirection){

    const page = parseHTML(body)
    
    const departCitiesList = page.find(`select[name="${flightDirection}"]`).children('option').map(
        function (idx, el) {
            return el.text();
        })

        const random = Math.floor(Math.random() * departCitiesList.length)

        let city = departCitiesList[random]

        return city

}