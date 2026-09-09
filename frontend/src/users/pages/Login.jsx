import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import '../styles/login.css';
import api from "../../utils/api";
import { getAuthenticatedRedirectPath, getRedirectPathForRole } from "../../utils/auth";
import { setCredentials } from "../../redux/authSlice";
import { updateSiteSettings } from "../../redux/siteSettingsSlice";
import Loader from "../../components/Loader";

// Email Validation Schema
const schema = yup.object({
  email: yup.string().email("Invalid Email Format").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
}).required();


export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const siteName = useSelector((state) => state.siteSettings.siteName);
  const logoUrl = useSelector((state) => state.siteSettings.logoUrl);

  const { register, handleSubmit, setValue, formState: { errors, isValid, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail) {
      setValue("email", savedEmail, { shouldValidate: true, shouldTouch: true, shouldDirty: true });
      setRememberMe(true);
    }
    if (savedPassword) {
      setValue("password", savedPassword, { shouldValidate: true, shouldTouch: true, shouldDirty: true });
    }
  }, [setValue]);

  useEffect(() => {
    const redirectPath = getAuthenticatedRedirectPath();

    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (data) => {
    try {
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
        localStorage.setItem("rememberedPassword", data.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      const res = await api.post("/api/auth/signin", { ...data, logoUrl });
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      if (res.data.siteSettings) {
        dispatch(updateSiteSettings(res.data.siteSettings));
      }

      toast.success("Login Successful!", { autoClose: 1000 });

      setTimeout(() => {
        navigate(getRedirectPathForRole(res.data.user.role));
      }, 1200);

    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed", { autoClose: 2500 });
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <>
      {(pageLoading || isSubmitting) && <Loader overlay />}
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-header">
            <h1 className="login-title">{siteName}</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                {...register("email")}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div className="form-options">
              <div className="checkbox-group">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="checkbox-input"
                  checked={rememberMe}
                  onChange={() => setRememberMe(prev => !prev)}
                />
                <label htmlFor="rememberMe" className="checkbox-label">Remember me</label>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={!isValid || isSubmitting}>
              {isSubmitting ? <span className="spinner"></span> : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">Need access? Contact a super admin.</p>
          </div>
        </div>
      </div>
    </>
  );
}
