import * as actionTypes from "./types";
import * as authService from "@/auth";
import { request } from "@/request";
import { erp } from "@/redux/erp/actions";

export const login =
  ({ loginData, selectedProject }) =>
  async (dispatch) => {
    dispatch({ type: actionTypes.REQUEST_LOADING });

    const data = await authService.login({ loginData });

    if (data.success === true) {
      const token = data.result.token;
      const admin = data.result.admin ?? data.result; // backend returns result = user (with role)

      // ✅ Store token
      localStorage.setItem("token", token);

      // ✅ Store auth in correct format expected by app
      const authData = {
        current: { ...admin, token }, // token INSIDE current (important)
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };

      localStorage.setItem("auth", JSON.stringify(authData));

      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: authData.current,
      });

      // ✅ Set project context immediately (Login component unmounts on auth success, so do it here)
      if (selectedProject && typeof selectedProject === 'object' && selectedProject._id) {
        dispatch(erp.setCurrentProject(selectedProject));
      }
    } else {
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  };



// ✅ REGISTER USER
export const register =
  ({ registerData }) =>
  async (dispatch) => {
    dispatch({ type: actionTypes.REQUEST_LOADING });

    const data = await authService.register({ registerData });

    if (data.success === true) {
      dispatch({ type: actionTypes.REGISTER_SUCCESS });
    } else {
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  };

// ✅ EMAIL VERIFY
export const verify =
  ({ userId, emailToken }) =>
  async (dispatch) => {
    dispatch({ type: actionTypes.REQUEST_LOADING });

    const data = await authService.verify({ userId, emailToken });

    if (data.success === true) {
      const auth_state = {
        current: data.result,
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };

      localStorage.setItem("auth", JSON.stringify(auth_state));
      localStorage.setItem("token", data.result.token);
      localStorage.removeItem("isLogout");

      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: auth_state,
      });
    } else {
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  };

// ✅ RESET PASSWORD
export const resetPassword =
  ({ resetPasswordData }) =>
  async (dispatch) => {
    dispatch({ type: actionTypes.REQUEST_LOADING });

    const data = await authService.resetPassword({ resetPasswordData });

    if (data.success === true) {
      const auth_state = {
        current: data.result,
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };

      localStorage.setItem("auth", JSON.stringify(auth_state));
      localStorage.setItem("token", data.result.token);
      localStorage.removeItem("isLogout");

      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: auth_state,
      });
    } else {
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  };

// ✅ LOGOUT USER
export const logout = () => async (dispatch) => {
  dispatch({ type: actionTypes.LOGOUT_SUCCESS });

  localStorage.removeItem("auth");
  localStorage.removeItem("token");
  localStorage.removeItem("settings");

  localStorage.setItem("isLogout", JSON.stringify({ isLogout: true }));

  await authService.logout();
};

// ✅ UPDATE PROFILE
export const updateProfile =
  ({ entity, jsonData }) =>
  async (dispatch) => {
    const data = await request.updateAndUpload({ entity, id: "", jsonData });

    if (data.success === true) {
      const auth_state = {
        current: data.result,
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };

      localStorage.setItem("auth", JSON.stringify(auth_state));
      localStorage.setItem("token", data.result.token);

      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: auth_state,
      });
    }
  };
