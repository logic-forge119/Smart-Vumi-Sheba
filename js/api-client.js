'use strict';

/**
 * Smart Bhumi Seba - Official API Client
 * Connects frontend to /api/v1 backend endpoints
 */
const BhumiApi = (() => {
  let mode = 'live'; // 'live' | 'demo'
  let sessionToken = localStorage.getItem('bhumi_session_token') || '';
  let sessionUid = localStorage.getItem('bhumi_session_uid') || '';

  // Initialize anonymous session if absent
  function ensureSession() {
    if (!sessionToken) {
      sessionUid = 'anon-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
      sessionToken = 'mock-token-' + sessionUid;
      localStorage.setItem('bhumi_session_token', sessionToken);
      localStorage.setItem('bhumi_session_uid', sessionUid);
    }
    return { token: sessionToken, uid: sessionUid };
  }

  function getBaseUrl() {
    return '/api/v1';
  }

  async function request(path, options = {}) {
    const { token } = ensureSession();
    const requestId = crypto.randomUUID ? crypto.randomUUID() : 'req-' + Date.now();
    const headers = {
      'Accept': 'application/json',
      'X-Request-Id': requestId,
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

    try {
      const res = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorObj = data?.error || {
          code: 'HTTP_' + res.status,
          message_bn: 'সার্ভারে অনুরোধ সম্পন্ন করা যায়নি।',
          request_id: requestId
        };
        const err = new Error(errorObj.message_bn);
        (err).code = errorObj.code;
        (err).status = res.status;
        (err).requestId = errorObj.request_id;
        throw err;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('সার্ভার থেকে সাড়া পেতে বিলম্ব হয়েছে; পুনরায় চেষ্টা করুন।');
        (timeoutErr).code = 'TIMEOUT';
        (timeoutErr).status = 504;
        throw timeoutErr;
      }
      throw err;
    }
  }

  return {
    getMode: () => mode,
    setMode: (m) => { mode = m; },
    getUid: () => ensureSession().uid,
    clearSession: () => {
      localStorage.removeItem('bhumi_session_token');
      localStorage.removeItem('bhumi_session_uid');
      sessionToken = '';
      sessionUid = '';
    },
    health: () => request('/health'),
    getScenarios: () => request('/scenarios'),
    getLocations: () => request('/locations'),
    getCitizens: () => request('/citizens'),
    searchRecords: (params) => {
      const q = new URLSearchParams();
      if (params.district) q.set('district', params.district);
      if (params.upazila) q.set('upazila', params.upazila);
      if (params.mouza) q.set('mouza', params.mouza);
      if (params.survey) q.set('survey', params.survey);
      if (params.khatian_no) q.set('khatian_no', params.khatian_no);
      if (params.dag_no) q.set('dag_no', params.dag_no);
      if (params.limit) q.set('limit', String(params.limit));
      if (params.offset) q.set('offset', String(params.offset));
      return request(`/records?${q.toString()}`);
    },
    getRecord: (id, survey, mouza) => {
      const q = new URLSearchParams();
      if (survey) q.set('survey', survey);
      if (mouza) q.set('mouza', mouza);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request(`/records/${encodeURIComponent(id)}${queryStr}`);
    },
    getMutation: (code) => request(`/mutations/${encodeURIComponent(code)}`),
    verify: (params, idempotencyKey) => {
      const headers = {};
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }
      return request('/verifications', {
        method: 'POST',
        headers,
        body: params
      });
    },
    getReports: () => request('/reports'),
    getReport: (id) => request(`/reports/${encodeURIComponent(id)}`),
    getDrafts: () => request('/drafts'),
    getDraft: (id) => request(`/drafts/${encodeURIComponent(id)}`),
    saveDraft: (clientDraftId, revision, body) => request('/drafts', {
      method: 'POST',
      body: { client_draft_id: clientDraftId, revision, body }
    }),
    updateDraft: (clientDraftId, revision, body) => request(`/drafts/${encodeURIComponent(clientDraftId)}`, {
      method: 'PUT',
      body: { client_draft_id: clientDraftId, revision, body }
    }),
    deleteDraft: (id) => request(`/drafts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
    getConfig: () => (window.__BHUMI_CONFIG__ || {})
  };
})();
