export const ALLOWED_ORIGINS = new Set(['https://jeileye.2025work11a.workers.dev','http://localhost:4173','http://127.0.0.1:4173']);
export function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    const host = u.hostname;
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port==='443') && s.endpoint.length<4096 &&
      (host==='fcm.googleapis.com' || host==='updates.push.services.mozilla.com' || host==='web.push.apple.com' || host.endsWith('.push.apple.com')) &&
      /^[A-Za-z0-9_-]{87}=?$/.test(s.keys?.p256dh||'') && /^[A-Za-z0-9_-]{22}={0,2}$/.test(s.keys?.auth||'');
  } catch { return false; }
}
export function validCredentials(data) {
  return /^[a-f0-9-]{36}$/.test(data?.id||'') && /^[a-f0-9]{64}$/.test(data?.token||'');
}
export function validJobs(jobs, now=Date.now()) {
  return Array.isArray(jobs) && jobs.length<=128 && jobs.every(j=>
    /^[a-z0-9-]{1,70}$/.test(j.plan_id||'') && Number.isInteger(j.slot) && j.slot>=0 && j.slot<=3 &&
    Number.isFinite(Date.parse(j.fire_at)) && Date.parse(j.fire_at)>now-60000 && Date.parse(j.fire_at)<now+366*86400000);
}
