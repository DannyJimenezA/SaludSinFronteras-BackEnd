# Ejemplos de Integración Frontend - TeleMed API

Este documento contiene ejemplos prácticos de cómo consumir la API desde el frontend.

---

## Tabla de Contenidos

1. [Angular](#angular)
2. [React](#react)
3. [Vue.js](#vuejs)
4. [Vanilla JavaScript](#vanilla-javascript)

---

## Angular

### Configuración Inicial

#### 1. Crear Servicio HTTP

```bash
ng generate service services/auth
ng generate service services/api
```

#### 2. Configurar Interceptor

**http.interceptor.ts**
```typescript
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();

    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokens: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.access_token);
          return next.handle(this.addToken(request, tokens.access_token));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => {
          return next.handle(this.addToken(request, jwt));
        })
      );
    }
  }
}
```

#### 3. Servicio de Autenticación

**auth.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface RegisterDto {
  FirstName: string;
  LastName1: string;
  LastName2?: string;
  Email: string;
  Password: string;
  PasswordConfirm: string;
  Phone?: string;
  IdentificationTypeId?: number;
  Identification?: string;
  GenderId?: number;
  DateOfBirth?: string;
  NativeLanguageId?: number;
  NationalityId?: number;
  ResidenceCountryId?: number;
  Role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

interface LoginDto {
  Email: string;
  Password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Cargar usuario del localStorage al iniciar
    const token = this.getAccessToken();
    if (token) {
      this.loadUserProfile();
    }
  }

  register(data: RegisterDto): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, data);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/verify-email`, { token });
  }

  login(credentials: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setTokens(response.access_token, response.refresh_token);
          this.loadUserProfile();
        })
      );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        this.setTokens(response.access_token, response.refresh_token);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/forgot-password`, { Email: email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, {
      token,
      newPassword
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private loadUserProfile(): void {
    this.http.get(`${this.API_URL}/users/me`).subscribe(
      user => this.currentUserSubject.next(user),
      error => {
        console.error('Error loading user profile', error);
        this.logout();
      }
    );
  }
}
```

#### 4. Componente de Registro

**register.component.ts**
```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      FirstName: ['', Validators.required],
      LastName1: ['', Validators.required],
      LastName2: [''],
      Email: ['', [Validators.required, Validators.email]],
      Password: ['', [Validators.required, Validators.minLength(8)]],
      PasswordConfirm: ['', Validators.required],
      Phone: [''],
      IdentificationTypeId: [null],
      Identification: [''],
      GenderId: [null],
      DateOfBirth: [''],
      NativeLanguageId: [null],
      NationalityId: [null],
      ResidenceCountryId: [null]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('Password');
    const confirm = form.get('PasswordConfirm');

    if (password && confirm && password.value !== confirm.value) {
      confirm.setErrors({ passwordMismatch: true });
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe(
      response => {
        this.loading = false;
        this.successMessage = response.message;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error => {
        this.loading = false;
        this.errorMessage = error.error.message || 'Error en el registro';
      }
    );
  }
}
```

**register.component.html**
```html
<div class="register-container">
  <h2>Registro de Usuario</h2>

  <div *ngIf="successMessage" class="alert alert-success">
    {{ successMessage }}
  </div>

  <div *ngIf="errorMessage" class="alert alert-danger">
    {{ errorMessage }}
  </div>

  <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
    <div class="form-group">
      <label>Nombre *</label>
      <input type="text" formControlName="FirstName" class="form-control">
      <div *ngIf="registerForm.get('FirstName')?.invalid && registerForm.get('FirstName')?.touched" class="text-danger">
        El nombre es requerido
      </div>
    </div>

    <div class="form-group">
      <label>Primer Apellido *</label>
      <input type="text" formControlName="LastName1" class="form-control">
      <div *ngIf="registerForm.get('LastName1')?.invalid && registerForm.get('LastName1')?.touched" class="text-danger">
        El primer apellido es requerido
      </div>
    </div>

    <div class="form-group">
      <label>Segundo Apellido</label>
      <input type="text" formControlName="LastName2" class="form-control">
    </div>

    <div class="form-group">
      <label>Email *</label>
      <input type="email" formControlName="Email" class="form-control">
      <div *ngIf="registerForm.get('Email')?.invalid && registerForm.get('Email')?.touched" class="text-danger">
        Email inválido
      </div>
    </div>

    <div class="form-group">
      <label>Contraseña *</label>
      <input type="password" formControlName="Password" class="form-control">
      <div *ngIf="registerForm.get('Password')?.invalid && registerForm.get('Password')?.touched" class="text-danger">
        Mínimo 8 caracteres
      </div>
    </div>

    <div class="form-group">
      <label>Confirmar Contraseña *</label>
      <input type="password" formControlName="PasswordConfirm" class="form-control">
      <div *ngIf="registerForm.get('PasswordConfirm')?.hasError('passwordMismatch')" class="text-danger">
        Las contraseñas no coinciden
      </div>
    </div>

    <div class="form-group">
      <label>Teléfono</label>
      <input type="tel" formControlName="Phone" class="form-control">
    </div>

    <button type="submit" class="btn btn-primary" [disabled]="loading">
      {{ loading ? 'Registrando...' : 'Registrarse' }}
    </button>
  </form>
</div>
```

---

## React

### Configuración con Axios

**api.js**
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**authService.js**
```javascript
import api from './api';

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      Email: email,
      Password: password,
    });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { Email: email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};
```

**RegisterForm.jsx**
```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName1: '',
    LastName2: '',
    Email: '',
    Password: '',
    PasswordConfirm: '',
    Phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.Password !== formData.PasswordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register(formData);
      setSuccess(response.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registro de Usuario</h2>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre *</label>
          <input
            type="text"
            name="FirstName"
            value={formData.FirstName}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Primer Apellido *</label>
          <input
            type="text"
            name="LastName1"
            value={formData.LastName1}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Segundo Apellido</label>
          <input
            type="text"
            name="LastName2"
            value={formData.LastName2}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Contraseña *</label>
          <input
            type="password"
            name="Password"
            value={formData.Password}
            onChange={handleChange}
            required
            minLength={8}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Confirmar Contraseña *</label>
          <input
            type="password"
            name="PasswordConfirm"
            value={formData.PasswordConfirm}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input
            type="tel"
            name="Phone"
            value={formData.Phone}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
```

---

## Vue.js

### Configuración con Axios

**api.js**
```javascript
import axios from 'axios';
import router from '@/router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**RegisterView.vue**
```vue
<template>
  <div class="register-container">
    <h2>Registro de Usuario</h2>

    <div v-if="successMessage" class="alert alert-success">
      {{ successMessage }}
    </div>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Nombre *</label>
        <input
          v-model="formData.FirstName"
          type="text"
          required
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Primer Apellido *</label>
        <input
          v-model="formData.LastName1"
          type="text"
          required
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Segundo Apellido</label>
        <input v-model="formData.LastName2" type="text" class="form-control" />
      </div>

      <div class="form-group">
        <label>Email *</label>
        <input
          v-model="formData.Email"
          type="email"
          required
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Contraseña *</label>
        <input
          v-model="formData.Password"
          type="password"
          required
          minlength="8"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label>Confirmar Contraseña *</label>
        <input
          v-model="formData.PasswordConfirm"
          type="password"
          required
          class="form-control"
        />
        <small v-if="passwordMismatch" class="text-danger">
          Las contraseñas no coinciden
        </small>
      </div>

      <div class="form-group">
        <label>Teléfono</label>
        <input v-model="formData.Phone" type="tel" class="form-control" />
      </div>

      <button type="submit" :disabled="loading" class="btn btn-primary">
        {{ loading ? 'Registrando...' : 'Registrarse' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();

const formData = ref({
  FirstName: '',
  LastName1: '',
  LastName2: '',
  Email: '',
  Password: '',
  PasswordConfirm: '',
  Phone: '',
});

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const passwordMismatch = computed(() => {
  return (
    formData.value.Password &&
    formData.value.PasswordConfirm &&
    formData.value.Password !== formData.value.PasswordConfirm
  );
});

const handleSubmit = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (passwordMismatch.value) {
    errorMessage.value = 'Las contraseñas no coinciden';
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/auth/register', formData.value);
    successMessage.value = response.data.message;
    setTimeout(() => router.push('/login'), 3000);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error en el registro';
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## Vanilla JavaScript

**auth.js**
```javascript
const API_BASE_URL = 'http://localhost:3000';

// Registro
async function register(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
}

// Login
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Email: email, Password: password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

// Request con autenticación
async function authenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('access_token');

  const config = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    let response = await fetch(`${API_BASE_URL}${url}`, config);

    // Si es 401, intentar refresh
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Reintentar con nuevo token
        config.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
        response = await fetch(`${API_BASE_URL}${url}`, config);
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en request:', error);
    throw error;
  }
}

// Refresh token
async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    logout();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      logout();
      return false;
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    logout();
    return false;
  }
}

// Logout
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login.html';
}

// Verificar autenticación
function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

// Ejemplo de uso en un formulario
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    FirstName: document.getElementById('firstName').value,
    LastName1: document.getElementById('lastName1').value,
    LastName2: document.getElementById('lastName2').value,
    Email: document.getElementById('email').value,
    Password: document.getElementById('password').value,
    PasswordConfirm: document.getElementById('passwordConfirm').value,
    Phone: document.getElementById('phone').value,
  };

  try {
    const result = await register(formData);
    alert(result.message);
    window.location.href = '/login.html';
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});
```

---

## Testing con Postman/Thunder Client

### Colección de Requests

```json
{
  "name": "TeleMed API",
  "requests": [
    {
      "name": "Register",
      "method": "POST",
      "url": "{{base_url}}/auth/register",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "FirstName": "Test",
        "LastName1": "User",
        "Email": "test@example.com",
        "Password": "Test1234",
        "PasswordConfirm": "Test1234"
      }
    },
    {
      "name": "Login",
      "method": "POST",
      "url": "{{base_url}}/auth/login",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "Email": "test@example.com",
        "Password": "Test1234"
      }
    },
    {
      "name": "Get User Profile",
      "method": "GET",
      "url": "{{base_url}}/users/me",
      "headers": [
        {
          "key": "Authorization",
          "value": "Bearer {{access_token}}"
        }
      ]
    }
  ],
  "variables": {
    "base_url": "http://localhost:3000",
    "access_token": ""
  }
}
```

---

## Manejo de Errores Común

```javascript
function handleApiError(error) {
  if (error.response) {
    // El servidor respondió con un status fuera del rango 2xx
    switch (error.response.status) {
      case 400:
        return 'Datos inválidos. Verifica los campos del formulario.';
      case 401:
        return 'No autorizado. Por favor inicia sesión.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 500:
        return 'Error del servidor. Intenta más tarde.';
      default:
        return error.response.data.message || 'Error desconocido';
    }
  } else if (error.request) {
    // La petición fue hecha pero no hubo respuesta
    return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  } else {
    // Algo pasó al configurar la petición
    return error.message || 'Error al procesar la solicitud';
  }
}
```

---

**Última actualización:** 2025-10-15
