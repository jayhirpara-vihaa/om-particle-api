import { Request } from "express";
import {
  getInitialPaginationFromQuery,
  prepareMessageFromParams,
  resNotFound,
  resSuccess,
} from "../../utils/shared-functions";
import { Op, Sequelize } from "sequelize";
import Image from "../../model/image.model";
import { ERROR_NOT_FOUND } from "../../utils/app-messages";
import DiamondConcierge from "../../model/diamondConcierge.model";
import AppUser from "../../model/app_user.model";
import Company from "../../model/company.modal";
import Master from "../../model/masters.model";
import { IMAGE_URL } from "../../config/env.var";

export const getDiamondConciergeList = async (req: Request) => {
  try {
    const { query } = req;
    let pagination = {
      ...getInitialPaginationFromQuery(query),
      search_text: query.search_text,
    };

    let where = [
      pagination.is_active ? { is_active: pagination.is_active } : {},
      pagination.search_text
        ? {
            [Op.or]: {
              name: { [Op.iLike]: `%${pagination.search_text}%` },
              phone_number: { [Op.iLike]: `%${pagination.search_text}%` },
            },
          }
        : {},
    ];

    const totalItems = await DiamondConcierge.count({
      where,
    });

    if (totalItems === 0) {
      return resSuccess({ data: { pagination, result: [] } });
    }
    pagination.total_items = totalItems;
    pagination.total_pages = Math.ceil(totalItems / pagination.per_page_rows);
    const diamondData = await DiamondConcierge.findAll({
      where,
      limit: pagination.per_page_rows,
      offset: (pagination.current_page - 1) * pagination.per_page_rows,
      order: [[pagination.sort_by, pagination.order_by]],
      attributes: [
        "id",
        "name",
        "message",
        "email",
        "phone_number",
        "color",
        "clarity",
        "shape",
        "weight",
        "measurement",
        "product_id",
        "stones",
        "certificate",
      ],
      include: [
        {
          model: AppUser,
          as: "user",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "user_type",
            "phone_number",
            "is_verified",
            [Sequelize.literal(`"user->company"."id"`), "company_id"],
            [
              Sequelize.literal(`"user->company"."company_name"`),
              "company_name",
            ],
            [
              Sequelize.literal(`"user->company"."company_website"`),
              "company_website",
            ],
            [Sequelize.literal(`"user->company"."abn_number"`), "abn_number"],
            [Sequelize.literal(`"user->company"."address"`), "address"],
            [Sequelize.literal(`"user->company"."city"`), "city"],
            [Sequelize.literal(`"user->company"."state"`), "state"],
            [Sequelize.literal(`"user->company"."country"`), "country"],
            [Sequelize.literal(`"user->company"."postcode"`), "postcode"],
          ],
          include: [
            {
              model: Company,
              as: "company",
              attributes: [],
            },
          ],
        },
      ],
    });
    return resSuccess({ data: { pagination, result: diamondData } });
  } catch (error) {
    throw error;
  }
};

export const getDiamondConciergeDetail = async (req: Request) => {
  try {
    const { concierge_id } = req.params;

    const diamondConciergeData = await DiamondConcierge.findOne({
      where: { id: concierge_id },
      attributes: [
        "id",
        "name",
        "message",
        "email",
        "phone_number",
        "weight",
        "measurement",
        "product_id",
        "certificate",
      ],
      include: [
        {
          model: AppUser,
          as: "user",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "user_type",
            "phone_number",
            "is_verified",
            [Sequelize.literal(`"user->company"."id"`), "company_id"],
            [
              Sequelize.literal(`"user->company"."company_name"`),
              "company_name",
            ],
            [
              Sequelize.literal(`"user->company"."company_website"`),
              "company_website",
            ],
            [Sequelize.literal(`"user->company"."abn_number"`), "abn_number"],
            [Sequelize.literal(`"user->company"."address"`), "address"],
            [Sequelize.literal(`"user->company"."city"`), "city"],
            [Sequelize.literal(`"user->company"."state"`), "state"],
            [Sequelize.literal(`"user->company"."country"`), "country"],
            [Sequelize.literal(`"user->company"."postcode"`), "postcode"],
          ],
          include: [
            {
              model: Company,
              as: "company",
              attributes: [],
            },
          ],
        },
        {
          model: Master,
          as: "shapeData",
          attributes: [
            "id",
            "name",
            "sort_code",
            "slug",
            "id_image",
            [
              Sequelize.fn(
                "CONCAT",
                IMAGE_URL,
                Sequelize.literal(`"shapeData->image"."image_path"`)
              ),
              "image_path",
            ],
          ],
          include: [
            {
              model: Image,
              as: "image",
              attributes: [],
            },
          ],
        },
        {
          model: Master,
          as: "stonesData",
          attributes: [
            "id",
            "name",
            "sort_code",
            "slug",
            "id_image",
            [
              Sequelize.fn(
                "CONCAT",
                IMAGE_URL,
                Sequelize.literal(`"stonesData->image"."image_path"`)
              ),
              "image_path",
            ],
          ],
          include: [
            {
              required: false,
              model: Image,
              as: "image",
              attributes: [],
            },
          ],
        },
        {
          model: Master,
          as: "colorData",
          attributes: ["id", "name", "sort_code", "slug"],
        },
        {
          model: Master,
          as: "clarityData",
          attributes: ["id", "name", "sort_code", "slug"],
        },
      ],
    });

    if (!(diamondConciergeData && diamondConciergeData.dataValues)) {
      return resNotFound({
        message: prepareMessageFromParams(ERROR_NOT_FOUND, [
          ["field_name", "Diamond Concierge"],
        ]),
      });
    }

    return resSuccess({ data: diamondConciergeData });
  } catch (error) {
    throw error;
  }
};
