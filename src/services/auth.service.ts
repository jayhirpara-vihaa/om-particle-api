import { Request, Response } from "express";
import {
  HUB_SPOT_API_URL,
  JWT_EXPIRED_ERROR_NAME,
  OTP_GENERATE_NUMBERS,
  PASSWORD_SOLT,
  STATIC_OTP,
} from "../utils/app-constants";

import {
  getAddHubspotRequest,
  columnValueLowerCase,
  getLocalDate,
  prepareMessageFromParams,
  resBadRequest,
  resError,
  resErrorDataExit,
  resNotFound,
  resSuccess,
  resUnknownError,
} from "../utils/shared-functions";
import {
  APP_NAME,
  FRONT_END_BASE_URL,
  IMAGE_PATH,
  IMAGE_URL,
  OTP_GENERATE_DIGITS,
  RESET_PASSWORD_PATH,
} from "../config/env.var";
import bcrypt from "bcrypt";
import dbContext from "../config/dbContext";
import AppUser from "../model/app_user.model";
import {
  ActiveStatus,
  DeleteStatus,
  FILE_TYPE,
  File_type,
  HUBSPOT_ASSOCIATION,
  IMAGE_TYPE,
  Image_type,
  UserType,
  UserVerification,
} from "../utils/app-enumeration";
import Customer from "../model/customer.modal";
import {
  ACCOUNT_NOT_VERIFIED,
  FORGOT_PASSWORD,
  INVALID_OTP,
  INVALID_USERNAME_PASSWORD,
  OTP_RESEND,
  PASSWORD_CHANGED,
  OTP_SENT,
  TOKEN_EXPIRED,
  USER_NOT_FOUND,
  VERIFIED,
  DEFAULT_STATUS_CODE_SUCCESS,
  INVALID_OLD_PASSWORD,
  NOT_VERIFIED,
} from "../utils/app-messages";
import {
  createResetToken,
  createUserJWT,
  verifyJWT,
} from "../helpers/jwt.helper";
import { mailPasswordResetLink, mailRegistationOtp } from "./mail.service";
import Wishlist from "../model/wishlist.model";
import CartProducts from "../model/cart-product.model";
import Image from "../model/image.model";
import { Sequelize } from "sequelize";
import Role from "../model/role.model";
import Company from "../model/companys.model";
import { moveFileToS3ByType } from "../helpers/file-helper";
import File from "../model/files.model";

export const test = (req: Request) => {
  return resSuccess({ data: "Done encryption decryption" });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
      confirm_password,
      company_name,
      company_website,
      registration_number,
      address,
      city,
      country,
      state,
      postcode,
      verification,
      remarks,
    } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let OTP = "";
    for (let i = 0; i < OTP_GENERATE_DIGITS; i++) {
      OTP += OTP_GENERATE_NUMBERS[Math.floor(Math.random() * 10)];
    }

    const pass_hash = await bcrypt.hash(password, Number(PASSWORD_SOLT));

    const emailExists = await AppUser.findOne({
      where: {
        email: columnValueLowerCase("email", email),
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
    });
    if (emailExists && emailExists.dataValues) {
      return resErrorDataExit({
        message: "User",
      });
    }

    const trn = await dbContext.transaction();
    try {
      let imageId;
      if (files["image"]) {
        const imageData = await moveFileToS3ByType(
          files["image"][0],
          Image_type.User
        )

        if (imageData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return imageData;
        }
        const imageResult = await Image.create(
          {
            image_path: imageData.data,
            created_at: getLocalDate(),
            created_by: req.body.session_res.id,
            is_deleted: DeleteStatus.No,
            is_active: ActiveStatus.Active,
            image_type: IMAGE_TYPE.User,
          },
          { transaction: trn }
        );
        imageId = imageResult.dataValues.id;
      }

      let pdfId;
      if (files["pdf"]) {
        const fileData = await moveFileToS3ByType(
          files["pdf"][0],
          File_type.Customer
        )

        if (fileData.code !== DEFAULT_STATUS_CODE_SUCCESS) {
          return fileData;
        }
        const fileResult = await File.create(
          {
            file_path: fileData.data,
            created_at: getLocalDate(),
            created_by: req.body.session_res.id,
            is_deleted: DeleteStatus.No,
            is_active: ActiveStatus.Active,
            file_type: FILE_TYPE.Customer,
          },
          { transaction: trn }
        );
        pdfId = fileResult.dataValues.id;
      }

      const createUser = await AppUser.create(
        {
          first_name: first_name,
          last_name: last_name,
          email: email,
          phone_number: phone_number,
          password: pass_hash,
          is_deleted: DeleteStatus.No,
          created_at: getLocalDate(),
          user_type: UserType.Customer,
          is_active: ActiveStatus.Active,
          is_verified: verification ?? UserVerification.NotVerified,
          id_image: imageId,
          id_pdf: pdfId,
          remarks,
          one_time_pass: OTP,
        },
        { transaction: trn }
      );
      // add if condition
      if (createUser.dataValues.id) {
        await Customer.create(
          {
            user_id: createUser.dataValues.id,
            company_name: company_name,
            company_website: company_website,
            registration_number: registration_number,
            address: address,
            city: city,
            state: state,
            country: country,
            postcode: postcode,
            is_deleted: DeleteStatus.No,
            created_at: getLocalDate(),
          },
          { transaction: trn }
        );
      }

      /****************************START HUBSPOT****************************/
      // create a new company for new user
      // const companyReq = {
      //   properties: {
      //     userid: createUser.dataValues.id,
      //     phone: phone_number,
      //     name: company_name,
      //     city: city,
      //     country: country,
      //     state: state,
      //     website: company_website,
      //   },
      // };
      // const company: any = await getAddHubspotRequest(
      //   HUB_SPOT_API_URL.createCompany,
      //   companyReq
      // );

      // // create a new contact for created company
      // const contactReq = {
      //   properties: {
      //     firstname: first_name,
      //     lastname: last_name,
      //     email: email,
      //     phone: phone_number,
      //     city: city,
      //     country: country,
      //     state: state,
      //     website: company_website,
      //   },
      //   associations: [
      //     {
      //       to: company.id, // added a association with company
      //       types: [
      //         {
      //           associationCategory: "HUBSPOT_DEFINED",
      //           associationTypeId: HUBSPOT_ASSOCIATION.ContactToCompany,
      //         },
      //       ],
      //     },
      //   ],
      // };

      // await getAddHubspotRequest(HUB_SPOT_API_URL.createContact, contactReq);

      /****************************END HUBSPOT****************************/
      const mailPayload = {
        toEmailAddress: email,
        contentTobeReplaced: {
          name: first_name + last_name,
          OTP,
          frontend_url: FRONT_END_BASE_URL,
          logo_image: IMAGE_PATH,
          app_name: APP_NAME,
        },
      };
      await mailRegistationOtp(mailPayload);

      await trn.commit();
      return resSuccess({
        data: { id: createUser.dataValues.id },
        message: OTP_SENT + " " + email,
      });
    } catch (error) {
      console.log(error)
      await trn.rollback();
      return resUnknownError({ data: error });
    }
  } catch (e) {
    console.log(e)
    throw e;
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { otp } = req.body;
    const verifyUser = await AppUser.findOne({
      where: {
        id: user_id,
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
    });

    if (verifyUser) {
      if (verifyUser.dataValues.one_time_pass === otp) {
        await AppUser.update(
          {
            is_verified: UserVerification.User_Verified,
            approved_date: getLocalDate(),
            modified_at: getLocalDate(),
          },
          {
            where: {
              id: verifyUser.dataValues.id,
              is_deleted: DeleteStatus.No,
              is_active: ActiveStatus.Active,
            },
          }
        );
        return resSuccess({
          message: prepareMessageFromParams(VERIFIED, [["field_name", "OTP"]]),
        });
      } else {
        return resBadRequest({ message: INVALID_OTP });
      }
    } else {
      return resNotFound({ message: USER_NOT_FOUND });
    }
  } catch (e) {
    throw e;
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const appUser = await AppUser.findOne({
      where: {
        email: columnValueLowerCase("email", email),
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
      attributes: [
        "approved_date",
        "created_at",
        "password",
        "is_verified",
        "first_name",
        "last_name",
        "id",
        "email",
        "id_image",
        "phone_number",
        "user_type",
        "id_role",
        "is_active",
        [
          Sequelize.literal(`CASE WHEN "image"."image_path" IS NOT NULL THEN CONCAT('${IMAGE_URL}', "image"."image_path") ELSE NULL END`),
          "image_path",
        ],
      ],
      include: [
        {
          required: false,
          model: Image,
          attributes: [],
          as: "image",
        },
      ],
    });

    if (!appUser) {
      return resNotFound({
        code: DEFAULT_STATUS_CODE_SUCCESS,
        message: USER_NOT_FOUND,
      });
    }

    const isPasswordValid = <any>(
      await bcrypt.compare(password, appUser.dataValues.password)
    );
    if (!isPasswordValid) {
      return resBadRequest({ message: INVALID_USERNAME_PASSWORD });
    }

    if (
      appUser.dataValues.user_type === UserType.Customer &&
      appUser.dataValues.is_verified === UserVerification.NotVerified
    ) {
      return resError({
        status: NOT_VERIFIED,
        message: ACCOUNT_NOT_VERIFIED,
        code: DEFAULT_STATUS_CODE_SUCCESS,
        data: appUser.dataValues.id,
      });
    }

    let company;

    if (appUser.dataValues.id_role != 0) {
      const roleData = await Role.findOne({
        where: { id: appUser.dataValues.id_role },
      })
      if (roleData && roleData.dataValues) {
        company = roleData.dataValues.company_id
      }
    }

    const jwtPayload = {
      id:
        appUser && appUser.dataValues
          ? appUser.dataValues.id
          : appUser.dataValues.id,
      user_type: appUser.dataValues.user_type,
      id_role: appUser.dataValues.id_role,
      company_id: company,
      is_verified: appUser.dataValues.is_verified,
    };

    const data = createUserJWT(
      appUser.dataValues.id,
      jwtPayload,
      appUser.dataValues.user_type
    );

    await AppUser.update(
      {
        token: data.token,
        refresh_token: data.refreshToken,
      },
      {
        where: {
          id: appUser.dataValues.id,
          is_deleted: DeleteStatus.No,
          is_active: ActiveStatus.Active,
        },
      }
    );

    const wishlistCount = await Wishlist.count({
      where: { user_id: appUser.dataValues.id },
    });
    const cartCount = await CartProducts.count({
      where: { user_id: appUser.dataValues.id },
    });

    return resSuccess({
      data: {
        token: data,
        userDetails: { ...appUser.dataValues, password: '' },
        count: {
          wishlistCount,
          cartCount,
        },
      },
    });
  } catch (e) {
    throw e;
  }
};

export const resendOtp = async (req: Request) => {
  try {
    const { user_id } = req.params;
    const verifyUser = await AppUser.findOne({
      where: {
        id: user_id,
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
    });

    let OTP = "";
    for (let i = 0; i < OTP_GENERATE_DIGITS; i++) {
      OTP += OTP_GENERATE_NUMBERS[Math.floor(Math.random() * 10)];
    }

    if (verifyUser) {
      await AppUser.update(
        {
          // one_time_pass: OTP,
          one_time_pass: STATIC_OTP,
          modified_at: getLocalDate(),
        },
        {
          where: {
            id: verifyUser.dataValues.id,
            is_deleted: DeleteStatus.No,
            is_active: ActiveStatus.Active,
          },
        }
      );

      const mailPayload = {
        toEmailAddress: verifyUser.dataValues.email,
        contentTobeReplaced: {
          name:
            verifyUser.dataValues.first_name + verifyUser.dataValues.last_name,
          OTP,
        },
      };
      await mailRegistationOtp(mailPayload);
      return resSuccess({ message: OTP_RESEND });
    }
  } catch (e) {
    throw e;
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { oldPassword, newPassword, session_res } = req.body;
    const appUser = await AppUser.findOne({
      where: {
        id: user_id,
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
    });

    const isPasswordMatch = <any>(
      await bcrypt.compare(oldPassword, appUser?.dataValues.password)
    );

    if (isPasswordMatch) {
      const pass_hash = await bcrypt.hash(newPassword, PASSWORD_SOLT);
      await AppUser.update(
        {
          password: pass_hash,
          modified_at: getLocalDate(),
          modified_by: session_res.user_id,
        },
        {
          where: {
            id: appUser?.dataValues.id,
            is_deleted: DeleteStatus.No,
            is_active: ActiveStatus.Active,
          },
        }
      );
      return resSuccess({ message: PASSWORD_CHANGED });
    } else {
      return resBadRequest({ message: INVALID_OLD_PASSWORD });
    }
  } catch (e) {
    throw e;
  }
};

export const forgotPassword = async (req: Request) => {
  try {
    const { email } = req.body;
    const appUser = await AppUser.findOne({
      where: {
        email: columnValueLowerCase("email", email),
        is_deleted: DeleteStatus.No,
        is_active: ActiveStatus.Active,
      },
    });

    if (appUser && appUser.dataValues) {
      const data = createResetToken(appUser.dataValues.id);

      const path = FRONT_END_BASE_URL + RESET_PASSWORD_PATH + data;

      const mailPayload = {
        toEmailAddress: appUser.dataValues.email,
        contentTobeReplaced: {
          name: appUser.dataValues.first_name + " " + (appUser.dataValues.last_name ? appUser.dataValues.last_name : ""),
          frontend_url: FRONT_END_BASE_URL,
          logo_image: IMAGE_PATH,
          app_name: APP_NAME,
          support_email: "ompl@abc.in",
          link: path,
        },
      };

      await mailPasswordResetLink(mailPayload);
      return resSuccess({ message: FORGOT_PASSWORD });
    } else {
      return resNotFound({ message: USER_NOT_FOUND });
    }
  } catch (e) {
    throw e;
  }
};

export const resetPassword = async (req: Request) => {
  try {
    const { token, newPassword } = req.body;
    const tokenRes = await verifyJWT(token);

    if (tokenRes.message === JWT_EXPIRED_ERROR_NAME) {
      return resBadRequest({ message: TOKEN_EXPIRED });
    } else {
      const pass_hash = await bcrypt.hash(newPassword, PASSWORD_SOLT);
      await AppUser.update(
        {
          password: pass_hash,
          modified_at: getLocalDate(),
        },
        {
          where: {
            id: tokenRes.data.id,
            is_deleted: DeleteStatus.No,
            is_active: ActiveStatus.Active,
          },
        }
      );
      return resSuccess({ message: PASSWORD_CHANGED });
    }
  } catch (e) {
    throw e;
  }
};


export const customerList = async () => {
  try {
    const customer = await Customer.findAll({
      attributes: ["id", "company_name", "company_website", "company_email", "registration_number", "address", "city", "state", "country", "postcode"],
      include: [{
        model: AppUser,
        as: "user",
        attributes: [],
        where: {
          is_verified: UserVerification.Admin_Verified,
          user_type: UserType.Customer
        }
      }]
    })

    return resSuccess({ data: customer })
  } catch (error) {
    throw error
  }
}