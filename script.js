import http from 'k6/http'
import {check,group} from 'k6'
import {parseHTML} from 'k6/html'
import {SharedArray} from 'k6/data'
import {Trend} from 'k6/metrics'
import { sleep } from 'k6'
import { browser } from 'k6/browser'

const yaTrend = new Trend('yaru')
const wwwTrend = new Trend('wwwru')

export const options = {

    noConnectionReuse: true,
    noVUConnectionReuse: true,
    dns: {
        ttl: '0',
    },

    scenarios: {
        requestWWW: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1m',
            preAllocatedVUs: 10,
            maxVUs: 20,
            exec: 'WWW',
            stages: [
                {target:120, duration: '5m'},
                {target:120, duration: '10m'},
                {target:144, duration: '5m'},
                {target:144, duration: '10m'}
            ],
            tags: {
                scenario_type: 'wwwru',
            },
       },

       requestYaRu: {
            executor: 'ramping-arrival-rate',
            startRate: 5,
            timeUnit: '1m',
            preAllocatedVUs: 5,
            maxVUs: 10,
            exec: 'yaRu',
            stages: [
                {target:60, duration: '5m'},
                {target:60, duration: '10m'},
                {target:72, duration: '5m'},
                {target:72, duration: '10m'}
            ],
            tags: {
                scenario_type: 'yaRu',
            },
        },
    },

    thresholds: {
        'http_req_duration{scenario_type:yaRu}': ['p(90) < 100'],
        'http_req_duration{scenario_type:wwwru}': ['p(90) < 650']
    },

    
}

export async function yaRu() {

    let yaRu = http.get('https://ya.ru', {
            tags: { my_tag: 'yaru_request'}})
        check(yaRu, {'status code is 200 yaru':(yaRu) => yaRu.status === 200}, { my_tag: 'yaru_check'})
        // console.error(yaRu.timings.duration)
}

export function WWW() {
    let www = http.get('http://www.ru', {
            tags: { my_tag: 'wwwru_request'}})
    check(www, {'status code is 200 wwwru':(www) => www.status === 200}, { my_tag: 'wwwru_check'})
}
