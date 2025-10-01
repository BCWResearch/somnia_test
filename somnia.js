import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const RPC_URL = __ENV.RPC_URL || 'http://10.132.0.2:8545';
const RESPONSE_P95_MS = Number(__ENV.RESPONSE_P95_MS || 300);
const RESPONSE_P99_MS = Number(__ENV.RESPONSE_P99_MS || 700);
const TIMEOUT = __ENV.TIMEOUT || '15s';
const DISABLE_RPC_TESTS = __ENV.DISABLE_RPC_TESTS === 'true';
const BATCH_PROB = Number(__ENV.BATCH_PROB || 0.0);
const BATCH_SIZE = Number(__ENV.BATCH_SIZE || 10);
const LOAD_PERCENT = Math.min(100, Math.max(1, Number(__ENV.LOAD_PERCENT || 10)));
const SCALE = LOAD_PERCENT / 100;

const BASE_START_RATE = Number(__ENV.BASE_START_RATE || 2000);
const BASE_WARM_RATE  = Number(__ENV.BASE_WARM_RATE  || 10000);
const BASE_STEP1_RATE = Number(__ENV.BASE_STEP1_RATE || 30000);
const BASE_STEP2_RATE = Number(__ENV.BASE_STEP2_RATE || 60000);
const BASE_STEP3_RATE = Number(__ENV.BASE_STEP3_RATE || 100000);
const BASE_SPIKE_RATE = Number(__ENV.BASE_SPIKE_RATE || 120000);

const START_RATE = Math.max(1, Math.floor(BASE_START_RATE * SCALE));
const WARM_RATE  = Math.max(1, Math.floor(BASE_WARM_RATE  * SCALE));
const STEP1_RATE = Math.max(1, Math.floor(BASE_STEP1_RATE * SCALE));
const STEP2_RATE = Math.max(1, Math.floor(BASE_STEP2_RATE * SCALE));
const STEP3_RATE = Math.max(1, Math.floor(BASE_STEP3_RATE * SCALE));
const SPIKE_RATE = Math.max(1, Math.floor(BASE_SPIKE_RATE * SCALE));

const BASE_WARM_PREVUS  = Number(__ENV.BASE_WARM_PREVUS  || 4000);
const BASE_WARM_MAXVUS  = Number(__ENV.BASE_WARM_MAXVUS  || 20000);
const BASE_STEP_PREVUS  = Number(__ENV.BASE_STEP_PREVUS  || 20000);
const BASE_STEP_MAXVUS  = Number(__ENV.BASE_STEP_MAXVUS  || 80000);
const BASE_SPIKE_PREVUS = Number(__ENV.BASE_SPIKE_PREVUS || 40000);
const BASE_SPIKE_MAXVUS = Number(__ENV.BASE_SPIKE_MAXVUS || 120000);

const WARM_PREVUS  = Math.max(100, Math.floor(BASE_WARM_PREVUS  * SCALE));
const WARM_MAXVUS  = Math.max(WARM_PREVUS, Math.floor(BASE_WARM_MAXVUS * SCALE));
const STEP_PREVUS  = Math.max(200, Math.floor(BASE_STEP_PREVUS  * SCALE));
const STEP_MAXVUS  = Math.max(STEP_PREVUS, Math.floor(BASE_STEP_MAXVUS * SCALE));
const SPIKE_PREVUS = Math.max(200, Math.floor(BASE_SPIKE_PREVUS * SCALE));
const SPIKE_MAXVUS = Math.max(SPIKE_PREVUS, Math.floor(BASE_SPIKE_MAXVUS * SCALE));

const addressList = new SharedArray('addresses', () => ([
  '0x4988cd1A3C2CD0925c7e29937059851B40f68Ee2','0x0EEb5212B93BCc56E3942C44a51102584eFacf85',
  '0xe62B4A83BAe42c05998e025D236BcBcEbfCdE6Bd','0x0B9D33C1ec82D9D070Bb8F8409E1B93C97C4225C',
  '0x8480249616fA8d0D41fc5624d111c6f2a2B8142b','0x2acaFd3db7401828C902aCC36c4a2371fE209557',
  '0x0bD9c00b590cD3b28dB63c03F70E719c13792E6d','0x01E7e4288aC6477d53C802E8a384DA49128B9440',
  '0x8FCCE774Cd6E64F35d26E955b986dB787B1b6665','0x8F207E79DbDE7B0647B12bc5DC467c9cFC0F0A21',
  '0x36FA70D60c9cBbd1f4C3D9112a241BF8879d2fbD','0x1360939dbE1e26b8989b2524027C8769d56971BD',
  '0x9DdB76EF9b84146579F15a80eeb78513A773766F','0xDF9Da319f55D8371c822DCe3891a1135c1dAdE81',
  '0x7f42DfE8DfFc080671FE0151D5F4eEB66e9bce79','0x4A933A5e7173dceB2BD8F693C4bc436645e51Eed',
  '0x6Ac94AAC7fF08b1Be8229827D0e26C97e5ec4092','0x7a74FAf5872a2de529C3ebeAb13BB26a6A5B854a',
  '0x334c0e82318Ca85abEd399d4B036d6083894509e','0xae6660f36ac9367301336cAbF9bA5D42Cf8D34da',
  '0xB329CfB0C7f1998e66C8508dCFD9b331AED8E3d0','0x553b5bebDf54384180c2fd14Ef6212595439eaDe',
  '0x81B30C4f1820c7282EFc45E7bA14A656acFf45c8','0xf2cAdf54690aF872aFC6AD1e93893f1394c2FD84',
  '0x4fbCE374541466CCC4754f3B6169E8587Ba6E2c6','0x27be8A3A72f99342057Ea082A93FffF416aA5051',
  '0x72234c177e4CFF3cb690BD3F08C217f8F32f8132','0x5d71238181479C5A9a532C9d1203944051A87251',
  '0xCF94dcDEC6b106FEC1AE006f7A74F61a8AcAB650','0xd203e6D16BDa8ae18ddDa8D087891Db246EFF866',
  '0x466CeFF1Bb1Ea8Be2Cc04E8109797c92A63C2D06','0xA71f44E22D850B5Fc00C422bf0e94946174f6193',
  '0x70c2eBaFde74B137241ccA2c84F25BCA545bae8f','0xC3Fbd501A220cB29e2274Cba5Ee3A049E7c93cC5',
  '0xDB0BF1B1b759952e8F1b1b391677612A805cA41A','0x82d1AE675b4Cc8D39cDC2c4355d9fAe50419346d',
  '0x711EE700055431537798aF4891a8B498a32B87f4','0x1C7433aDCFA435D0e40c53925d8a8074134Cc0c1',
  '0x902821fe7eB50959330D018A544de2Ad57B45a84','0xd2B1A4222Db08e950685c383b002Cf7543D0Faa3'
]));

export const options = {
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': [`p(95)<${RESPONSE_P95_MS}`, `p(99)<${RESPONSE_P99_MS}`]
  },
  scenarios: {
    warmup: {
      executor: 'ramping-arrival-rate',
      startRate: START_RATE,
      timeUnit: '1s',
      preAllocatedVUs: WARM_PREVUS,
      maxVUs: WARM_MAXVUS,
      stages: [
        { target: START_RATE, duration: '30s' },
        { target: WARM_RATE, duration: '90s' }
      ],
      exec: 'mix',
      gracefulStop: '30s'
    },
    step_load: {
      executor: 'ramping-arrival-rate',
      startRate: STEP1_RATE,
      timeUnit: '1s',
      preAllocatedVUs: STEP_PREVUS,
      maxVUs: STEP_MAXVUS,
      stages: [
        { target: STEP1_RATE, duration: '2m' },
        { target: STEP2_RATE, duration: '3m' },
        { target: STEP3_RATE, duration: '4m' },
        { target: STEP3_RATE, duration: '2m' },
        { target: 0, duration: '1m' }
      ],
      startTime: '2m',
      exec: 'mix',
      gracefulStop: '30s'
    },
    spike: {
      executor: 'constant-arrival-rate',
      rate: SPIKE_RATE,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: SPIKE_PREVUS,
      maxVUs: SPIKE_MAXVUS,
      startTime: '14m',
      exec: 'mix',
      gracefulStop: '30s'
    }
  }
};

const HEADERS = { 'Content-Type': 'application/json', 'Connection': 'keep-alive' };

function rpcRequest(method, params = [], id = 1, extraTags = {}) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  return http.post(RPC_URL, payload, { headers: HEADERS, timeout: TIMEOUT, tags: { rpc_method: method, ...extraTags } });
}

function toHex(n) {
  return '0x' + Math.max(0, Number(n)).toString(16);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const METHODS = [
  { name: 'eth_blockNumber', weight: 20, build: (d) => [] },
  { name: 'eth_chainId', weight: 8, build: (d) => [] },
  { name: 'net_version', weight: 7, build: (d) => [] },
  { name: 'eth_getBalance', weight: 35, build: (d) => [pickRandom(addressList), 'latest'] },
  { name: 'eth_getLogs', weight: 2, build: (d) => [{ fromBlock: toHex(Math.max(0, d.blockHeight - 1)), toBlock: 'latest' }] },
  { name: 'eth_getBlockByNumber', weight: 20, build: (d) => [toHex(d.blockHeight), false] }
];

const cumulative = (() => {
  let acc = 0;
  return METHODS.map(m => (acc += m.weight, { ...m, acc }));
})();
function pickWeighted() {
  const r = Math.random() * cumulative[cumulative.length - 1].acc;
  return cumulative.find(m => r < m.acc);
}

export function setup() {
  if (DISABLE_RPC_TESTS) return { blockHeight: 0 };
  const r = rpcRequest('eth_blockNumber', []);
  let latest = 0;
  if (r.status === 200 && r.body) {
    try { const j = r.json(); if (j && j.result) latest = parseInt(j.result, 16); } catch (e) {}
  }
  if (!latest) throw new Error(`Could not fetch latest block height from ${RPC_URL}`);
  return { blockHeight: Math.max(0, latest - 100) };
}

export function mix(data) {
  if (DISABLE_RPC_TESTS) return;
  let latest = data.blockHeight;
  const h = rpcRequest('eth_blockNumber', [], 1, { phase: 'height-refresh' });
  if (h.status === 200) {
    try { const j = h.json(); if (j && j.result) latest = parseInt(j.result, 16); } catch (_) {}
  }
  const ctx = { blockHeight: Math.max(0, latest - 100) };
  const doBatch = Math.random() < BATCH_PROB;
  if (doBatch) {
    const batch = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const m = pickWeighted();
      batch.push({ jsonrpc: '2.0', id: i + 1, method: m.name, params: m.build(ctx) });
    }
    const res = http.post(RPC_URL, JSON.stringify(batch), { headers: HEADERS, timeout: TIMEOUT, tags: { rpc_method: 'batch', batch: 'true' } });
    check(res, {
      'batch status 200': (r) => r.status === 200,
      'batch valid json': (r) => { try { const j = r.json(); return Array.isArray(j); } catch { return false; } },
      'batch no rpc error': (r) => { try { return r.json().every(x => !x.error); } catch { return false; } }
    });
  } else {
    const m = pickWeighted();
    const res = rpcRequest(m.name, m.build(ctx), 1, { batch: 'false' });
    check(res, {
      'status 200': (r) => r.status === 200,
      'valid jsonrpc': (r) => { try { const j = r.json(); return j && j.jsonrpc === '2.0' && ('result' in j || 'error' in j); } catch { return false; } },
      [`p<${RESPONSE_P95_MS}ms`]: (r) => r.timings.duration < RESPONSE_P95_MS
    });
  }
}
